import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { OracleVerification } from './entities/oracle-verification.entity';

// ── Outcome enum ─────────────────────────────────────────────────────────────
export enum VerificationOutcome {
  VERIFIED           = 'VERIFIED',
  INCOMPLETE_DOCS    = 'INCOMPLETE_DOCS',
  OWNERSHIP_CONFLICT = 'OWNERSHIP_CONFLICT',
  LEGAL_PENDING      = 'LEGAL_PENDING',
}

// ── Input type ────────────────────────────────────────────────────────────────
export interface OwnershipSubmission {
  applicationId:       string;
  ownerName:           string;
  nationalId:          string;
  surveyPlanNumber:    string;
  communityWitnesses:  string[];   // At least 3 required; ≥2 must be confirmed
  legalClearanceHash:  string | null;
  documents:           Array<{ name: string; hash: string }>;
}

// ── Result type ───────────────────────────────────────────────────────────────
export interface OwnershipVerificationResult {
  outcome:  VerificationOutcome;
  score:    number;     // 0–100
  reasons:  string[];
  detail:   Record<string, unknown>;
}

// ── Registry adapter interface (injectable / mockable) ────────────────────────
/**
 * In production, implement this against your institutional registry API.
 * For testing, inject MockRegistryAdapter.
 *
 * IMPORTANT: Document exactly what constitutes a "match" vs "conflict" here —
 * these criteria are stress-tested in Component 4's fraud scenarios.
 */
export interface RegistryAdapter {
  lookup(nationalId: string): Promise<{
    ownerName:        string;
    nationalId:       string;
    surveyPlanNumber: string;
  } | null>;
  confirmWitnesses(witnesses: string[]): Promise<number>;
}

// ── Service ───────────────────────────────────────────────────────────────────
/**
 * Component 3A — Ownership Verification Oracle (Objective iii)
 *
 * Match / Conflict criteria (from PROJECT.md Section 10):
 * ┌──────────────────────┬────────────────────────────┬─────────────────────────┐
 * │ Field                │ Match criterion             │ Conflict trigger        │
 * ├──────────────────────┼────────────────────────────┼─────────────────────────┤
 * │ Owner name           │ ≥80% Levenshtein similarity │ < 80%                   │
 * │ NIN                  │ Exact match                 │ Any mismatch            │
 * │ Survey plan number   │ Exact match                 │ Any mismatch or absent  │
 * │ Community witnesses  │ ≥2 of 3 confirmed           │ 0 or 1 confirmed        │
 * │ Legal clearance      │ Hash present and signed     │ Absent or unsigned      │
 * └──────────────────────┴────────────────────────────┴─────────────────────────┘
 *
 * Scoring:
 *   Name match     → +30 pts
 *   NIN match      → +25 pts
 *   Survey plan    → +20 pts
 *   Witnesses      → +15 pts
 *   Legal hash     → +10 pts
 *   Total max      =  100 pts
 *
 * Outcome thresholds:
 *   score < 30    → OWNERSHIP_CONFLICT
 *   score 30–59   → INCOMPLETE_DOCS
 *   No legal hash → LEGAL_PENDING
 *   else          → VERIFIED
 */
@Injectable()
export class OwnershipVerificationService {
  private readonly logger = new Logger(OwnershipVerificationService.name);

  constructor(
    @InjectRepository(OracleVerification)
    private readonly verificationRepo: Repository<OracleVerification>,
    private readonly config: ConfigService,
  ) {}

  async verify(
    submission: OwnershipSubmission,
    registryAdapter: RegistryAdapter,
  ): Promise<OwnershipVerificationResult> {
    const reasons: string[] = [];
    let score = 0;
    const nameThreshold = this.config.get<number>('ORACLE_FUZZY_MATCH_THRESHOLD', 0.8);
    const minWitnesses  = this.config.get<number>('ORACLE_MIN_COMMUNITY_WITNESSES', 2);

    // ── Step 3: Retrieve from institutional source ─────────────────────
    const registryRecord = await registryAdapter.lookup(submission.nationalId);

    if (!registryRecord) {
      reasons.push('No matching record found in institutional registry');
      const result: OwnershipVerificationResult = {
        outcome: VerificationOutcome.OWNERSHIP_CONFLICT,
        score: 0,
        reasons,
        detail: { nationalId: submission.nationalId },
      };
      await this.persistResult(submission.applicationId, result);
      return result;
    }

    const detail: Record<string, unknown> = {};

    // ── Step 4: Compare retrieved vs submitted ─────────────────────────

    // Name match (fuzzy, Levenshtein)
    const nameSimilarity = this.levenshteinSimilarity(
      submission.ownerName,
      registryRecord.ownerName,
    );
    detail.nameSimilarity = nameSimilarity;
    if (nameSimilarity >= nameThreshold) {
      score += 30;
    } else {
      reasons.push(
        `Name mismatch: submitted="${submission.ownerName}", ` +
        `registry="${registryRecord.ownerName}", similarity=${(nameSimilarity * 100).toFixed(1)}%`
      );
    }

    // NIN exact match
    if (submission.nationalId === registryRecord.nationalId) {
      score += 25;
    } else {
      reasons.push(`National ID mismatch`);
    }

    // Survey plan exact match
    if (
      submission.surveyPlanNumber &&
      submission.surveyPlanNumber === registryRecord.surveyPlanNumber
    ) {
      score += 20;
    } else {
      reasons.push(
        submission.surveyPlanNumber
          ? `Survey plan number mismatch: "${submission.surveyPlanNumber}" vs "${registryRecord.surveyPlanNumber}"`
          : 'Survey plan number absent'
      );
    }

    // Community witnesses (≥2 of 3 confirmed)
    const confirmed = await registryAdapter.confirmWitnesses(submission.communityWitnesses);
    detail.confirmedWitnesses = confirmed;
    if (confirmed >= minWitnesses) {
      score += 15;
    } else {
      reasons.push(
        `Insufficient community witnesses: ${confirmed} confirmed, ${minWitnesses} required`
      );
    }

    // Legal clearance hash
    if (submission.legalClearanceHash) {
      score += 10;
    } else {
      reasons.push('Legal clearance document absent');
    }

    // ── Step 5: Determine outcome ─────────────────────────────────────
    let outcome: VerificationOutcome;
    if (score < 30) {
      outcome = VerificationOutcome.OWNERSHIP_CONFLICT;
    } else if (score < 60) {
      outcome = VerificationOutcome.INCOMPLETE_DOCS;
    } else if (!submission.legalClearanceHash) {
      outcome = VerificationOutcome.LEGAL_PENDING;
    } else {
      outcome = VerificationOutcome.VERIFIED;
    }

    const result: OwnershipVerificationResult = { outcome, score, reasons, detail };
    await this.persistResult(submission.applicationId, result);

    this.logger.log(
      `Oracle result for application ${submission.applicationId}: ${outcome} (score=${score})`
    );

    return result;
  }

  // ── Persistence ──────────────────────────────────────────────────────
  private async persistResult(
    applicationId: string,
    result: OwnershipVerificationResult,
  ): Promise<void> {
    await this.verificationRepo.save(
      this.verificationRepo.create({
        applicationId,
        outcome:     result.outcome,
        score:       result.score,
        reasons:     result.reasons,
        rawResponse: result.detail,
      }),
    );
  }

  // ── Levenshtein similarity: 1 − (distance / maxLen) ──────────────────
  levenshteinSimilarity(a: string, b: string): number {
    const s1 = a.toLowerCase().trim();
    const s2 = b.toLowerCase().trim();
    if (s1 === s2) return 1;
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1;
    return 1 - this.levenshteinDistance(s1, s2) / maxLen;
  }

  private levenshteinDistance(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
    );
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }
}
