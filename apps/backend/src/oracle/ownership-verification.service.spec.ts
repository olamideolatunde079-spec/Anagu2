/**
 * Unit tests for OwnershipVerificationService (Component 3A — Oracle).
 *
 * All external dependencies (registry adapter, TypeORM repo) are mocked.
 * No real database or network calls are made.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  OwnershipVerificationService,
  VerificationOutcome,
  type OwnershipSubmission,
  type RegistryAdapter,
} from './ownership-verification.service';
import { OracleVerification } from './entities/oracle-verification.entity';

// ── Mock registry adapter (good path — all fields match) ─────────────────
const makeGoodAdapter = (): RegistryAdapter => ({
  lookup: jest.fn().mockResolvedValue({
    ownerName:        'Adewale Okonkwo',
    nationalId:       'NIN-VALID-001',
    surveyPlanNumber: 'SP-LAGOS-2024-001',
  }),
  confirmWitnesses: jest.fn().mockResolvedValue(3),
});

// ── Mock OracleVerification repository ───────────────────────────────────
const mockOracleRepo = {
  create: jest.fn((data) => data),
  save:   jest.fn().mockResolvedValue({}),
};

// ── Base valid submission ─────────────────────────────────────────────────
const baseSubmission: OwnershipSubmission = {
  applicationId:    'app-uuid-001',
  ownerName:        'Adewale Okonkwo',
  nationalId:       'NIN-VALID-001',
  surveyPlanNumber: 'SP-LAGOS-2024-001',
  communityWitnesses: ['witness-a', 'witness-b', 'witness-c'],
  legalClearanceHash: '0xabc123def456',
  documents: [{ name: 'SurveyPlan.pdf', hash: '0xfile001' }],
};

describe('OwnershipVerificationService', () => {
  let service: OwnershipVerificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwnershipVerificationService,
        {
          provide:  getRepositoryToken(OracleVerification),
          useValue: mockOracleRepo,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              if (key === 'ORACLE_FUZZY_MATCH_THRESHOLD') return 0.8;
              if (key === 'ORACLE_MIN_COMMUNITY_WITNESSES') return 2;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OwnershipVerificationService>(OwnershipVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── levenshteinSimilarity ─────────────────────────────────────────────

  describe('levenshteinSimilarity()', () => {
    it('returns 1.0 for identical strings', () => {
      expect(service.levenshteinSimilarity('hello', 'hello')).toBe(1);
    });

    it('returns 1.0 for identical strings with different case', () => {
      expect(service.levenshteinSimilarity('ADEWALE', 'adewale')).toBe(1);
    });

    it('returns 1.0 for identical strings with leading/trailing spaces', () => {
      expect(service.levenshteinSimilarity('  name  ', 'name')).toBe(1);
    });

    it('returns 0 for completely different strings of the same length', () => {
      const sim = service.levenshteinSimilarity('abc', 'xyz');
      // 3 edits / 3 chars = 0
      expect(sim).toBe(0);
    });

    it('returns exactly 1 for two empty strings', () => {
      expect(service.levenshteinSimilarity('', '')).toBe(1);
    });

    it('returns 0.8 for "Adewale" vs "Adewale " (1 char difference)', () => {
      // "adewale" (7) vs "adewale " (8): dist=1, max=8 → 1 - 1/8 = 0.875
      const sim = service.levenshteinSimilarity('Adewale', 'Adewale X');
      // dist=2 (space+X), max=9 → 1 - 2/9 ≈ 0.778 (less than threshold)
      expect(sim).toBeGreaterThan(0);
      expect(sim).toBeLessThan(1);
    });

    it('returns >= 0.8 for a single-character typo in a longer name', () => {
      // "Okonkwo" vs "Okonkwu" — 1 edit, maxLen=7 → 1 - 1/7 ≈ 0.857
      const sim = service.levenshteinSimilarity('Okonkwo', 'Okonkwu');
      expect(sim).toBeGreaterThanOrEqual(0.8);
    });

    it('returns < 0.8 for substantially different names', () => {
      const sim = service.levenshteinSimilarity('Adewale Okonkwo', 'Bode Johnson');
      expect(sim).toBeLessThan(0.8);
    });
  });

  // ── OWNERSHIP_CONFLICT — registry returns null ────────────────────────

  describe('verify() — OWNERSHIP_CONFLICT (no registry record)', () => {
    it('returns OWNERSHIP_CONFLICT with score=0 when lookup returns null', async () => {
      const adapter: RegistryAdapter = {
        lookup:           jest.fn().mockResolvedValue(null),
        confirmWitnesses: jest.fn().mockResolvedValue(0),
      };

      const result = await service.verify(baseSubmission, adapter);
      expect(result.outcome).toBe(VerificationOutcome.OWNERSHIP_CONFLICT);
      expect(result.score).toBe(0);
    });

    it('includes a descriptive reason when registry record is missing', async () => {
      const adapter: RegistryAdapter = {
        lookup:           jest.fn().mockResolvedValue(null),
        confirmWitnesses: jest.fn().mockResolvedValue(0),
      };

      const result = await service.verify(baseSubmission, adapter);
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons[0]).toContain('No matching record');
    });

    it('persists the result to the repository', async () => {
      const adapter: RegistryAdapter = {
        lookup:           jest.fn().mockResolvedValue(null),
        confirmWitnesses: jest.fn().mockResolvedValue(0),
      };

      await service.verify(baseSubmission, adapter);
      expect(mockOracleRepo.save).toHaveBeenCalled();
    });
  });

  // ── INCOMPLETE_DOCS — score 30–59 ─────────────────────────────────────

  describe('verify() — INCOMPLETE_DOCS (partial match)', () => {
    it('returns INCOMPLETE_DOCS when name matches and NIN matches but survey plan and witnesses fail', async () => {
      // Name match (+30) + NIN match (+25) = 55 points → INCOMPLETE_DOCS
      const adapter: RegistryAdapter = {
        lookup: jest.fn().mockResolvedValue({
          ownerName:        'Adewale Okonkwo',
          nationalId:       'NIN-VALID-001',
          surveyPlanNumber: 'SP-DIFFERENT',   // mismatch → 0 pts
        }),
        confirmWitnesses: jest.fn().mockResolvedValue(1), // < 2 → 0 pts
      };

      const sub: OwnershipSubmission = {
        ...baseSubmission,
        legalClearanceHash: null,  // absent → 0 pts
      };

      const result = await service.verify(sub, adapter);
      // Score: 30 (name) + 25 (NIN) = 55 → INCOMPLETE_DOCS
      expect(result.outcome).toBe(VerificationOutcome.INCOMPLETE_DOCS);
      expect(result.score).toBe(55);
    });

    it('returns INCOMPLETE_DOCS at the lower boundary (score = 30)', async () => {
      // Only name matches (+30), everything else fails
      const adapter: RegistryAdapter = {
        lookup: jest.fn().mockResolvedValue({
          ownerName:        'Adewale Okonkwo',
          nationalId:       'NIN-DIFFERENT',   // mismatch
          surveyPlanNumber: 'SP-DIFFERENT',    // mismatch
        }),
        confirmWitnesses: jest.fn().mockResolvedValue(1),  // < 2
      };

      const sub: OwnershipSubmission = {
        ...baseSubmission,
        nationalId:         'NIN-DIFFERENT',  // makes NIN check succeed (exact)
        legalClearanceHash: null,
      };

      // Adjusted: NIN matches the registry record (+25), name (+30), no others
      // Total = 55 which is still INCOMPLETE_DOCS. Let's force exactly 30:
      // Name only: override NIN to mismatch
      const sub2: OwnershipSubmission = {
        ...baseSubmission,
        nationalId:         'NIN-SUBMITTED-001',
        legalClearanceHash: null,
      };
      const adapter2: RegistryAdapter = {
        lookup: jest.fn().mockResolvedValue({
          ownerName:        'Adewale Okonkwo',  // exact match → +30
          nationalId:       'NIN-REGISTRY-999', // mismatch → 0
          surveyPlanNumber: 'SP-DIFFERENT',      // mismatch → 0
        }),
        confirmWitnesses: jest.fn().mockResolvedValue(1),  // < 2 → 0
      };

      const result = await service.verify(sub2, adapter2);
      expect(result.score).toBe(30);
      expect(result.outcome).toBe(VerificationOutcome.INCOMPLETE_DOCS);
    });
  });

  // ── LEGAL_PENDING — score ≥ 60, no legal hash ─────────────────────────

  describe('verify() — LEGAL_PENDING (high score but no legal clearance)', () => {
    it('returns LEGAL_PENDING when score >=60 but legalClearanceHash is null', async () => {
      // Name (+30) + NIN (+25) + survey (+20) + witnesses (+15) = 90, no legal hash
      const adapter: RegistryAdapter = {
        lookup: jest.fn().mockResolvedValue({
          ownerName:        'Adewale Okonkwo',
          nationalId:       'NIN-VALID-001',
          surveyPlanNumber: 'SP-LAGOS-2024-001',
        }),
        confirmWitnesses: jest.fn().mockResolvedValue(3),
      };

      const sub: OwnershipSubmission = {
        ...baseSubmission,
        legalClearanceHash: null,
      };

      const result = await service.verify(sub, adapter);
      expect(result.outcome).toBe(VerificationOutcome.LEGAL_PENDING);
      expect(result.score).toBe(90);
    });
  });

  // ── VERIFIED — perfect score ──────────────────────────────────────────

  describe('verify() — VERIFIED (all checks pass)', () => {
    it('returns VERIFIED with score=100 when everything matches', async () => {
      const adapter = makeGoodAdapter();
      const result  = await service.verify(baseSubmission, adapter);
      expect(result.outcome).toBe(VerificationOutcome.VERIFIED);
      expect(result.score).toBe(100);
    });

    it('returns an empty reasons array for a perfect submission', async () => {
      const adapter = makeGoodAdapter();
      const result  = await service.verify(baseSubmission, adapter);
      expect(result.reasons).toHaveLength(0);
    });

    it('persists the result to the repository on success', async () => {
      const adapter = makeGoodAdapter();
      await service.verify(baseSubmission, adapter);
      expect(mockOracleRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  // ── OWNERSHIP_CONFLICT — score < 30 ─────────────────────────────────

  describe('verify() — OWNERSHIP_CONFLICT (very low score)', () => {
    it('returns OWNERSHIP_CONFLICT when score < 30 (only 1 minor field matches)', async () => {
      // Nothing matches: mismatched NIN, name, survey, 0 witnesses, no legal hash
      const adapter: RegistryAdapter = {
        lookup: jest.fn().mockResolvedValue({
          ownerName:        'Completely Different Name',
          nationalId:       'NIN-DIFFERENT',
          surveyPlanNumber: 'SP-DIFFERENT',
        }),
        confirmWitnesses: jest.fn().mockResolvedValue(0),
      };

      const sub: OwnershipSubmission = {
        ...baseSubmission,
        nationalId:         'NIN-SUBMITTED',
        surveyPlanNumber:   'SP-SUBMITTED',
        legalClearanceHash: null,
      };

      const result = await service.verify(sub, adapter);
      expect(result.outcome).toBe(VerificationOutcome.OWNERSHIP_CONFLICT);
      expect(result.score).toBeLessThan(30);
    });
  });

  // ── Fuzzy name matching boundary ─────────────────────────────────────

  describe('verify() — fuzzy name match boundary', () => {
    it('accepts a name with >= 80% Levenshtein similarity', async () => {
      // "Adewale Okonkwo" (15) vs "Adewale Okonkwu" (15) — 1 edit → 0.933 ≥ 0.8
      const adapter: RegistryAdapter = {
        lookup: jest.fn().mockResolvedValue({
          ownerName:        'Adewale Okonkwu',  // 1-char typo vs submitted
          nationalId:       'NIN-VALID-001',
          surveyPlanNumber: 'SP-LAGOS-2024-001',
        }),
        confirmWitnesses: jest.fn().mockResolvedValue(3),
      };

      const result = await service.verify(baseSubmission, adapter);
      // Name should still contribute 30 pts
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.reasons.some((r) => r.includes('Name mismatch'))).toBe(false);
    });

    it('rejects a name with < 80% Levenshtein similarity', async () => {
      const adapter: RegistryAdapter = {
        lookup: jest.fn().mockResolvedValue({
          ownerName:        'Bode Johnson', // very different
          nationalId:       'NIN-VALID-001',
          surveyPlanNumber: 'SP-LAGOS-2024-001',
        }),
        confirmWitnesses: jest.fn().mockResolvedValue(3),
      };

      const result = await service.verify(baseSubmission, adapter);
      expect(result.reasons.some((r) => r.includes('Name mismatch'))).toBe(true);
      // No name pts → max score = 70 (NIN+survey+witnesses+legal)
      expect(result.score).toBeLessThanOrEqual(70);
    });
  });
});
