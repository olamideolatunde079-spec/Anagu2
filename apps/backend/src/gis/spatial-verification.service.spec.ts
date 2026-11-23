/**
 * Unit tests for SpatialVerificationService (Component 1 — GIS).
 *
 * All PostGIS queries are mocked via a Jest mock DataSource so no real
 * database connection is required.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { keccak256, toUtf8Bytes } from 'ethers';
import {
  SpatialVerificationService,
  type Coordinate,
} from './spatial-verification.service';

// ── Helper: build the mock DataSource with controllable query behaviour ────
function buildMockDataSource(overrides?: Partial<{ query: jest.Mock }>) {
  return {
    query: jest.fn(),
    ...overrides,
  } as unknown as DataSource;
}

// ── Helper: configure query mock for a clean valid parcel ─────────────────
function setupValidParcel(mockDs: { query: jest.Mock }) {
  mockDs.query
    // Call 1 — ST_IsValid check → valid
    .mockResolvedValueOnce([{ is_valid: true, reason: null }])
    // Call 2 — overlap check → no overlap
    .mockResolvedValueOnce([]);
}

describe('SpatialVerificationService', () => {
  let service: SpatialVerificationService;
  let mockDataSource: { query: jest.Mock };

  const validRectangle: Coordinate[] = [
    [3.0, 6.0],
    [3.5, 6.0],
    [3.5, 6.5],
    [3.0, 6.5],
    // ring is auto-closed by coordinatesToWKT
  ];

  beforeEach(async () => {
    mockDataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpatialVerificationService,
        {
          provide:  DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<SpatialVerificationService>(SpatialVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── coordinatesToWKT ──────────────────────────────────────────────────

  describe('coordinatesToWKT()', () => {
    it('produces a well-formed WKT POLYGON string', () => {
      const wkt = service.coordinatesToWKT(validRectangle);
      expect(wkt).toMatch(/^POLYGON\(\(/);
      expect(wkt).toMatch(/\)\)$/);
    });

    it('auto-closes the ring when first and last points differ', () => {
      const open: Coordinate[] = [[0, 0], [1, 0], [1, 1], [0, 1]];
      const wkt = service.coordinatesToWKT(open);
      // The ring must close: last point == first point
      const inner = wkt.replace('POLYGON((', '').replace('))', '');
      const pts = inner.split(', ').map((p) => p.split(' ').map(Number));
      expect(pts[pts.length - 1]).toEqual(pts[0]);
    });

    it('does not duplicate the closing point when the ring is already closed', () => {
      const closed: Coordinate[] = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
      const wkt = service.coordinatesToWKT(closed);
      const inner = wkt.replace('POLYGON((', '').replace('))', '');
      const pts   = inner.split(', ');
      // Should still close (same count as input — already closed)
      expect(pts.length).toBe(5);
    });

    it('formats coordinate pairs as "lng lat"', () => {
      const single: Coordinate[] = [[3.123, 6.456], [3.789, 6.456], [3.789, 6.789]];
      const wkt = service.coordinatesToWKT(single);
      expect(wkt).toContain('3.123 6.456');
    });
  });

  // ── INSUFFICIENT_COORDINATES ──────────────────────────────────────────

  describe('verifyParcel() — insufficient coordinates', () => {
    it('returns INSUFFICIENT_COORDINATES for an empty array', async () => {
      const result = await service.verifyParcel([]);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('INSUFFICIENT_COORDINATES');
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('returns INSUFFICIENT_COORDINATES for exactly 2 points', async () => {
      const result = await service.verifyParcel([[0, 0], [1, 1]]);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('INSUFFICIENT_COORDINATES');
    });

    it('does NOT return INSUFFICIENT_COORDINATES for exactly 3 points', async () => {
      // 3 points → a valid triangle; mock returns valid geometry
      mockDataSource.query
        .mockResolvedValueOnce([{ is_valid: true, reason: null }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ hash: 'aabbccdd' }]);

      const result = await service.verifyParcel([[0, 0], [1, 0], [0.5, 1]]);
      expect(result.reason).not.toBe('INSUFFICIENT_COORDINATES');
    });
  });

  // ── INVALID_GEOMETRY ──────────────────────────────────────────────────

  describe('verifyParcel() — invalid geometry', () => {
    it('returns INVALID_GEOMETRY when ST_IsValid is false', async () => {
      mockDataSource.query.mockResolvedValueOnce([{
        is_valid: false,
        reason:   'Self-intersection at (3.25 6.25)',
      }]);

      const result = await service.verifyParcel(validRectangle);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('INVALID_GEOMETRY');
      expect(result.diagnosticMessage).toContain('Self-intersection');
    });

    it('does not run the overlap check when geometry is invalid', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ is_valid: false, reason: 'Ring not closed' }]);

      await service.verifyParcel(validRectangle);
      // Only 1 query should have been made (geometry check only)
      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
    });

    it('includes the wkt in the result for debugging', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ is_valid: false, reason: 'Bad geometry' }]);
      const result = await service.verifyParcel(validRectangle);
      expect(result.wkt).toBeDefined();
      expect(result.wkt).toMatch(/^POLYGON/);
    });
  });

  // ── OVERLAPPING_PARCEL ────────────────────────────────────────────────

  describe('verifyParcel() — overlapping parcel', () => {
    it('returns OVERLAPPING_PARCEL when the overlap query returns a result', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ is_valid: true, reason: null }])
        .mockResolvedValueOnce([{ id: 'existing-parcel-uuid' }]);

      const result = await service.verifyParcel(validRectangle);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('OVERLAPPING_PARCEL');
      expect(result.overlappingParcelId).toBe('existing-parcel-uuid');
    });

    it('includes the overlapping parcel ID in the diagnostic message', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ is_valid: true, reason: null }])
        .mockResolvedValueOnce([{ id: 'parcel-123' }]);

      const result = await service.verifyParcel(validRectangle);
      expect(result.diagnosticMessage).toContain('parcel-123');
    });

    it('does not query for spatialHash when overlap is found', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ is_valid: true, reason: null }])
        .mockResolvedValueOnce([{ id: 'overlap-id' }]);

      await service.verifyParcel(validRectangle);
      // Only 2 calls: geometry + overlap; hash call should NOT happen
      expect(mockDataSource.query).toHaveBeenCalledTimes(2);
    });

    it('passes excludeParcelId to the overlap query', async () => {
      setupValidParcel(mockDataSource);

      await service.verifyParcel(validRectangle, 'excluded-parcel-id');
      // The second query (overlap) should receive the excluded UUID as 3rd param
      const overlapCall = mockDataSource.query.mock.calls[1];
      expect(overlapCall[1]).toContain('excluded-parcel-id');
    });
  });

  // ── Valid parcel (happy path) ─────────────────────────────────────────

  describe('verifyParcel() — valid parcel', () => {
    it('returns { valid: true } when geometry is fine and no overlap', async () => {
      setupValidParcel(mockDataSource);
      const result = await service.verifyParcel(validRectangle);
      expect(result.valid).toBe(true);
    });

    it('returns a spatialHash string prefixed with 0x', async () => {
      setupValidParcel(mockDataSource);
      const result = await service.verifyParcel(validRectangle);
      expect(result.spatialHash).toBeDefined();
      expect(result.spatialHash).toMatch(/^0x[0-9a-f]+/i);
    });

    it('includes the WKT in the result', async () => {
      setupValidParcel(mockDataSource);
      const result = await service.verifyParcel(validRectangle);
      expect(result.wkt).toMatch(/^POLYGON/);
    });

    it('runs exactly 2 DB queries for a valid parcel', async () => {
      setupValidParcel(mockDataSource);
      await service.verifyParcel(validRectangle);
      expect(mockDataSource.query).toHaveBeenCalledTimes(2);
    });

    it('returns the keccak256 hash of the WKT sent to the registry contract', async () => {
      setupValidParcel(mockDataSource);
      const result = await service.verifyParcel(validRectangle);
      expect(result.spatialHash).toBe(
        keccak256(toUtf8Bytes(service.coordinatesToWKT(validRectangle))),
      );
    });
  });
});
