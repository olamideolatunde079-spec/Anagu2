/**
 * Component 4 — Processing Latency Benchmark (Part B)
 *
 * Instruments the 5-stage registration pipeline 30 times.
 * Reports mean ± sd for each stage and total.
 * Compares against the baseline simulator for the same 30 runs.
 * Output matches Table 4C format from PROJECT.md.
 *
 * All external calls (DB, blockchain, MQTT) are replaced with fast in-memory
 * stubs so that the measured latency reflects service logic, not I/O.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { performance } from 'perf_hooks';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SpatialVerificationService } from '../gis/spatial-verification.service';
import { OwnershipVerificationService, type OwnershipSubmission, type RegistryAdapter } from '../oracle/ownership-verification.service';
import { BaselineSimulatorService } from './baseline-simulator.service';
import { OracleVerification } from '../oracle/entities/oracle-verification.entity';

const RUNS = 30;

// ── Mock DataSource — returns valid geometry instantly ────────────────────────
const mockDataSource = {
  query: jest.fn((sql: string) => {
    if (sql.includes('ST_IsValid')) {
      return Promise.resolve([{ is_valid: true, reason: null }]);
    }
    if (sql.includes('ST_Intersects')) {
      return Promise.resolve([]); // no overlap
    }
    if (sql.includes('digest')) {
      return Promise.resolve([{ hash: 'aabbccdd001122' }]);
    }
    return Promise.resolve([]);
  }),
};

// ── Mock OracleVerification repo ──────────────────────────────────────────────
const mockOracleRepo = {
  create: jest.fn((x) => x),
  save:   jest.fn().mockResolvedValue({}),
};

// ── Mock blockchain (instant round-trip) ──────────────────────────────────────
const mockBlockchainService = {
  isRevoked:         jest.fn().mockResolvedValue(false),
  getTitleByTokenId: jest.fn().mockResolvedValue(null),
};

// ── Mock MQTT (in-memory, no network) ────────────────────────────────────────
const mockMqttService = {
  publish: jest.fn().mockResolvedValue(undefined),
};

// ── Registry adapter ──────────────────────────────────────────────────────────
const fastRegistryAdapter: RegistryAdapter = {
  lookup: jest.fn().mockResolvedValue({
    ownerName:        'Adewale Okonkwo',
    nationalId:       'NIN-VALID-001',
    surveyPlanNumber: 'SP-001',
  }),
  confirmWitnesses: jest.fn().mockResolvedValue(3),
};

// ── Test data ─────────────────────────────────────────────────────────────────
const testCoordinates: [number, number][] = [
  [3.0, 6.0], [3.5, 6.0], [3.5, 6.5], [3.0, 6.5],
];

const testOwnership: OwnershipSubmission = {
  applicationId:    'benchmark-app',
  ownerName:        'Adewale Okonkwo',
  nationalId:       'NIN-VALID-001',
  surveyPlanNumber: 'SP-001',
  communityWitnesses: ['w1', 'w2', 'w3'],
  legalClearanceHash: '0xlegalhash',
  documents: [{ name: 'deed.pdf', hash: '0xdoc' }],
};

// ── Stat helpers ──────────────────────────────────────────────────────────────
function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function sd(values: number[]): number {
  const m = mean(values);
  return Math.sqrt(
    values.map((v) => (v - m) ** 2).reduce((a, b) => a + b, 0) / values.length,
  );
}

function fmt(values: number[]): string {
  return `${mean(values).toFixed(2)} ± ${sd(values).toFixed(2)} ms`;
}

// ── Timing accumulator ────────────────────────────────────────────────────────
interface RunResult {
  t_gis:      number;
  t_oracle:   number;
  t_contract: number;
  t_nft:      number;
  t_sync:     number;
  T_total:    number;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Component 4 — Processing Latency Benchmark (Part B)', () => {
  let gisService:      SpatialVerificationService;
  let oracleService:   OwnershipVerificationService;
  let baselineService: BaselineSimulatorService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpatialVerificationService,
        OwnershipVerificationService,
        BaselineSimulatorService,
        {
          provide:  DataSource,
          useValue: mockDataSource,
        },
        {
          provide:  getRepositoryToken(OracleVerification),
          useValue: mockOracleRepo,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def?: unknown) => {
              if (key === 'ORACLE_FUZZY_MATCH_THRESHOLD')   return 0.8;
              if (key === 'ORACLE_MIN_COMMUNITY_WITNESSES') return 2;
              if (key === 'GIS_OVERLAP_TOLERANCE_METRES')  return 0.5;
              return def;
            },
          },
        },
      ],
    }).compile();

    gisService      = module.get(SpatialVerificationService);
    oracleService   = module.get(OwnershipVerificationService);
    baselineService = module.get(BaselineSimulatorService);
  });

  it(`runs the 5-stage pipeline ${RUNS} times and reports Table 4C`, async () => {
    const proposedRuns: RunResult[]  = [];
    const baselineResults: number[]  = [];

    for (let i = 0; i < RUNS; i++) {
      // ── Stage 1: GIS ──────────────────────────────────────────────────
      const t0 = performance.now();
      await gisService.verifyParcel(testCoordinates);
      const t_gis = performance.now() - t0;

      // ── Stage 2: Oracle ──────────────────────────────────────────────
      const t1 = performance.now();
      await oracleService.verify(
        { ...testOwnership, applicationId: `bm-run-${i}` },
        fastRegistryAdapter,
      );
      const t_oracle = performance.now() - t1;

      // ── Stage 3: Smart contract (simulated — mock RPC) ────────────────
      const t2 = performance.now();
      await mockBlockchainService.isRevoked('1');
      const t_contract = performance.now() - t2;

      // ── Stage 4: NFT issuance (simulated — same mock) ─────────────────
      const t3 = performance.now();
      await mockBlockchainService.getTitleByTokenId('1');
      const t_nft = performance.now() - t3;

      // ── Stage 5: MQTT sync ────────────────────────────────────────────
      const t4 = performance.now();
      await mockMqttService.publish('land/evaluation/timing-test', { run: i });
      const t_sync = performance.now() - t4;

      const T_total = t_gis + t_oracle + t_contract + t_nft + t_sync;

      proposedRuns.push({ t_gis, t_oracle, t_contract, t_nft, t_sync, T_total });

      // ── Baseline run (same transaction complexity) ─────────────────────
      const baselineResult = await baselineService.processApplication({
        ownerName:        testOwnership.ownerName,
        surveyPlanNumber: testOwnership.surveyPlanNumber,
        documents:        testOwnership.documents,
        coordinates:      testCoordinates,
        nationalId:       testOwnership.nationalId,
      });
      baselineResults.push(baselineResult.processingTimeMs);
    }

    // ── Compute statistics ─────────────────────────────────────────────────
    const gisVals      = proposedRuns.map((r) => r.t_gis);
    const oracleVals   = proposedRuns.map((r) => r.t_oracle);
    const contractVals = proposedRuns.map((r) => r.t_contract);
    const nftVals      = proposedRuns.map((r) => r.t_nft);
    const syncVals     = proposedRuns.map((r) => r.t_sync);
    const totalVals    = proposedRuns.map((r) => r.T_total);
    const baselineMean = mean(baselineResults);
    const baselineSd   = sd(baselineResults);

    const proposedTotalMean = mean(totalVals);
    const improvement = baselineMean > 0
      ? (((proposedTotalMean - baselineMean) / baselineMean) * 100).toFixed(1)
      : 'N/A';

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('  TABLE 4C — End-to-End Processing Latency (mean ± sd, ms)        ');
    console.log(`  ${RUNS} runs with mocked external services                       `);
    console.log('═══════════════════════════════════════════════════════════════════');
    console.table([
      { 'Stage':                       'Spatial verification',
        'Proposed Framework (ms)':     fmt(gisVals),
        'Baseline (ms)':               'N/A' },
      { 'Stage':                       'Ownership/oracle verification',
        'Proposed Framework (ms)':     fmt(oracleVals),
        'Baseline (ms)':               'N/A' },
      { 'Stage':                       'Smart contract execution',
        'Proposed Framework (ms)':     fmt(contractVals),
        'Baseline (ms)':               'N/A' },
      { 'Stage':                       'NFT issuance',
        'Proposed Framework (ms)':     fmt(nftVals),
        'Baseline (ms)':               'N/A' },
      { 'Stage':                       'MQTT synchronisation',
        'Proposed Framework (ms)':     fmt(syncVals),
        'Baseline (ms)':               'N/A' },
      { 'Stage':                       'TOTAL',
        'Proposed Framework (ms)':     fmt(totalVals),
        'Baseline (ms)':               `${baselineMean.toFixed(2)} ± ${baselineSd.toFixed(2)}` },
      { 'Stage':                       'Improvement',
        'Proposed Framework (ms)':     '',
        'Baseline (ms)':               `${improvement}% (vs in-process baseline)` },
    ]);

    console.log('');
    console.log('NOTE: Mocked services return instantly. Re-run against real');
    console.log('infrastructure (make component4) for production latency data.');
    console.log('Fill values into PROJECT.md → Table 4C.');
    console.log('');

    // Sanity assertions: each stage completes in under 1000 ms with mocks
    expect(mean(gisVals)).toBeLessThan(1000);
    expect(mean(oracleVals)).toBeLessThan(1000);
    expect(mean(totalVals)).toBeLessThan(5000);
    expect(proposedRuns).toHaveLength(RUNS);
  }, 60_000);
});
