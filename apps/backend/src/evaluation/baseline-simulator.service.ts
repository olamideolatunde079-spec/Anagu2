import { Injectable } from '@nestjs/common';
import { performance } from 'perf_hooks';

export interface BaselineResult {
  approved:         boolean;
  detectedFraud:    boolean;
  processingTimeMs: number;
  checks: {
    documentsPresent: boolean;
    spatialCrossCheck: false;   // paper-based: never performed
    ownershipCrossCheck: false; // paper-based: never performed
  };
}

/**
 * Component 4 — Conventional Baseline Simulator
 *
 * Represents a manual/paper-based process:
 *  ✓ Checks document PRESENCE (not authenticity)
 *  ✗ No automated spatial cross-check
 *  ✗ No automated ownership cross-check
 *
 * Used as the comparator in all fraud, latency, and storage evaluations.
 */
@Injectable()
export class BaselineSimulatorService {
  async processApplication(application: {
    ownerName?: string;
    surveyPlanNumber?: string;
    documents?: unknown[];
    coordinates?: unknown;
    nationalId?: string;
  }): Promise<BaselineResult> {
    const start = performance.now();

    // Paper-based: only check that required fields/documents are present
    const documentsPresent = !!(
      application.ownerName &&
      application.surveyPlanNumber &&
      application.documents &&
      application.documents.length > 0
    );

    return {
      approved:      documentsPresent,
      detectedFraud: false, // baseline cannot detect fraud
      processingTimeMs: performance.now() - start,
      checks: {
        documentsPresent,
        spatialCrossCheck:  false,
        ownershipCrossCheck: false,
      },
    };
  }
}
