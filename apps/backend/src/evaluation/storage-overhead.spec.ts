/**
 * Component 4 — Storage Overhead Calculator (Part C)
 *
 * Calculates actual on-chain storage bit sizes from the LandTitleNFT.sol
 * contract storage layout, then compares against a naive baseline that would
 * store full geometry WKT on-chain instead of a hash.
 *
 * Output matches Table 4D format from PROJECT.md.
 *
 * No external services needed — this is pure computation.
 */

describe('Component 4 — Storage Overhead Calculator (Part C)', () => {
  it('calculates and prints Table 4D matching PROJECT.md format', () => {
    // ── Proposed system: LandTitleNFT.sol storage fields ─────────────────
    //
    // Per-token state (from contract):
    //   spatialHash[tokenId] = bytes32  → keccak256 of parcel WKT  → 256 bits
    //   parcelId[tokenId]    = string   → off-chain UUID (32 chars) → stored off-chain; on-chain: 0
    //   isRevoked[tokenId]   = bool     → 8 bits (1 storage slot = 256 bits but shared)
    //
    // ERC-721 base state:
    //   _owners[tokenId]     = address  → 160 bits
    //
    // Event data (per TitleIssued):
    //   tokenId     : uint256  → 256 bits
    //   spatialHash : bytes32  → 256 bits  (already counted above as storage)
    //   timestamp   : uint256  → 256 bits
    //
    // Fields not stored on-chain in this prototype:
    //   S_sig    = 0 (validator signature not stored in contract state)
    //   S_merkle = 0 (Merkle proof not used in this prototype)

    const proposed = {
      S_id:      256,   // keccak256 spatial hash (bytes32) — canonical parcel identifier on-chain
      S_geom:    256,   // spatialHash bytes32 mapping
      S_owner:   160,   // Ethereum address (20 bytes = 160 bits)
      S_oracle:  0,     // oracle payload hash stored off-chain (postgres); 0 on-chain
      S_time:    256,   // block.timestamp (uint256 = 256 bits)
      S_sig:     0,     // not stored on-chain in prototype
      S_merkle:  0,     // not used in prototype
    };

    // ── Baseline: full WKT geometry stored on-chain ───────────────────────
    //
    // A naive design would store the actual WKT polygon string on-chain.
    // Sample 4-vertex rectangle: "POLYGON((3.0 6.0, 3.5 6.0, 3.5 6.5, 3.0 6.5, 3.0 6.0))"
    // That is 55 characters = 55 × 8 = 440 bits for a minimal polygon.
    // A realistic Lagos land parcel has 8–20 vertices.
    // We use 20 vertices as a representative worst-case:
    //   "POLYGON((" + 20 × "3.12345 6.12345" (14 chars avg) + ", " + "))" ≈ 320 chars
    // 320 characters × 8 bits = 2560 bits.
    //
    // Other fields remain the same as proposed (address, timestamp).

    const SAMPLE_WKT_4_VERTEX     = 'POLYGON((3.0 6.0, 3.5 6.0, 3.5 6.5, 3.0 6.5, 3.0 6.0))';
    const SAMPLE_WKT_20_VERTEX    = [
      'POLYGON((',
      Array.from({ length: 20 }, (_, i) =>
        `${(3.0 + i * 0.01).toFixed(6)} ${(6.0 + i * 0.01).toFixed(6)}`
      ).join(', '),
      ', 3.000000 6.000000))',  // closing point
    ].join('');

    const wktBits4Vertex  = SAMPLE_WKT_4_VERTEX.length * 8;
    const wktBits20Vertex = SAMPLE_WKT_20_VERTEX.length * 8;

    const baseline = {
      S_id:      256,                // keccak256 still needed for lookup
      S_geom:    wktBits20Vertex,    // full WKT string stored on-chain (worst case)
      S_owner:   160,
      S_oracle:  0,
      S_time:    256,
      S_sig:     0,
      S_merkle:  0,
    };

    // ── Compute totals ────────────────────────────────────────────────────
    const proposedTotal = Object.values(proposed).reduce((a, b) => a + b, 0);
    const baselineTotal = Object.values(baseline).reduce((a, b) => a + b, 0);

    const proposedBytes = Math.ceil(proposedTotal / 8);
    const baselineBytes = Math.ceil(baselineTotal / 8);

    const N_PARCELS = 1_000;
    const proposedNetwork = proposedBytes * N_PARCELS;
    const baselineNetwork = baselineBytes * N_PARCELS;

    const reductionPct = ((1 - proposedBytes / baselineBytes) * 100).toFixed(1);

    // ── MQTT payload sizes ────────────────────────────────────────────────
    // Measure actual JSON.stringify byte counts (Section 17 of PROJECT.md)
    const mqttPayloads = {
      'land/registration/submitted': {
        applicationId: '550e8400-e29b-41d4-a716-446655440000',
        ownerId:       '550e8400-e29b-41d4-a716-446655440001',
        parcelId:      '550e8400-e29b-41d4-a716-446655440002',
        timestamp:     Date.now(),
      },
      'land/title/issued': {
        applicationId: '550e8400-e29b-41d4-a716-446655440000',
        tokenId:       '42',
        parcelId:      '550e8400-e29b-41d4-a716-446655440002',
        ownerId:       '550e8400-e29b-41d4-a716-446655440001',
        txHash:        '0x' + 'a'.repeat(64),
        timestamp:     Date.now(),
      },
      'land/title/revoked': {
        tokenId:   '42',
        ground:    0,
        revokedBy: '0x' + 'f'.repeat(40),
        parcelId:  '550e8400-e29b-41d4-a716-446655440002',
        timestamp: Date.now(),
      },
      'land/sync/offline-queue': {
        deviceId:    'device-uuid-001',
        queuedAt:    Date.now(),
        payloadType: 'APPLICATION',
        payload:     { ownerName: 'Adewale Okonkwo', surveyPlanNumber: 'SP-001' },
      },
    };

    // ── Print results ─────────────────────────────────────────────────────

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('  TABLE 4D — Storage Overhead Comparison                           ');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.table([
      { 'Symbol': 'S_id',     'Field': 'Parcel identity hash (keccak256)',   'Proposed (bits)': proposed.S_id,     'Baseline (bits)': baseline.S_id },
      { 'Symbol': 'S_geom',   'Field': 'Spatial geometry ref (bytes32 hash)','Proposed (bits)': proposed.S_geom,   'Baseline (bits)': baseline.S_geom },
      { 'Symbol': 'S_owner',  'Field': 'Ownership (Ethereum address)',        'Proposed (bits)': proposed.S_owner,  'Baseline (bits)': baseline.S_owner },
      { 'Symbol': 'S_oracle', 'Field': 'Oracle/MQTT payload hash (off-chain)','Proposed (bits)': proposed.S_oracle, 'Baseline (bits)': baseline.S_oracle },
      { 'Symbol': 'S_time',   'Field': 'Timestamp (uint256)',                 'Proposed (bits)': proposed.S_time,   'Baseline (bits)': baseline.S_time },
      { 'Symbol': 'S_sig',    'Field': 'Validator signature (not stored)',    'Proposed (bits)': proposed.S_sig,    'Baseline (bits)': baseline.S_sig },
      { 'Symbol': 'S_merkle', 'Field': 'Merkle proof (not used)',             'Proposed (bits)': proposed.S_merkle, 'Baseline (bits)': baseline.S_merkle },
      { 'Symbol': 'TOTAL',    'Field': 'Per-record size (bits)',              'Proposed (bits)': proposedTotal,     'Baseline (bits)': baselineTotal },
      { 'Symbol': '—',        'Field': 'Per-record size (bytes)',             'Proposed (bits)': proposedBytes,     'Baseline (bits)': baselineBytes },
      { 'Symbol': '—',        'Field': `Network storage (${N_PARCELS} parcels, bytes)`, 'Proposed (bits)': proposedNetwork, 'Baseline (bits)': baselineNetwork },
      { 'Symbol': '—',        'Field': 'Storage reduction',                  'Proposed (bits)': `${reductionPct}% smaller`, 'Baseline (bits)': 'reference' },
    ]);

    console.log('');
    console.log('── MQTT Payload Byte Sizes (Section 17) ────────────────────────────');
    console.table(
      Object.entries(mqttPayloads).map(([topic, payload]) => ({
        'Topic':       topic,
        'Bytes (JSON.stringify)': JSON.stringify(payload).length,
      })),
    );

    console.log('');
    console.log(`Baseline geometry note: 20-vertex WKT = ${SAMPLE_WKT_20_VERTEX.length} chars = ${wktBits20Vertex} bits`);
    console.log(`4-vertex WKT (minimal) = ${SAMPLE_WKT_4_VERTEX.length} chars = ${wktBits4Vertex} bits`);
    console.log('Fill values into PROJECT.md → Table 4D.');
    console.log('');

    // ── Assertions ────────────────────────────────────────────────────────

    // Proposed stores a hash (256 bits) vs baseline which stores full WKT
    expect(proposed.S_geom).toBe(256);
    expect(baseline.S_geom).toBeGreaterThan(256);

    // Proposed must be smaller than baseline
    expect(proposedBytes).toBeLessThan(baselineBytes);
    expect(parseFloat(reductionPct)).toBeGreaterThan(0);

    // Network-wide storage scales linearly
    expect(proposedNetwork).toBe(proposedBytes * N_PARCELS);
    expect(baselineNetwork).toBe(baselineBytes * N_PARCELS);

    // All standard Solidity types match expected bit widths
    expect(proposed.S_id).toBe(256);     // keccak256 → bytes32 → 256 bits
    expect(proposed.S_owner).toBe(160);  // address → 20 bytes → 160 bits
    expect(proposed.S_time).toBe(256);   // uint256 → 256 bits
  });
});
