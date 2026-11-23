# Besu Network — Anagu

## Configuration

| Parameter | Value | Reason |
|-----------|-------|--------|
| Consensus | QBFT | Deterministic finality for statutory transactions |
| Block period | 1 second | Fast confirmation for registry operations |
| Epoch length | 30,000 blocks | ~8.3 hours between validator set recalculations |
| Chain ID | 1337 | Local development (use a unique ID in production) |
| Gas price | 0 | Permissioned network — no fee market needed |

## Consensus Rationale

- **Proof-of-Work rejected** — computational overhead and probabilistic finality don't suit
  a permissioned, institutionally governed context where validator identity is already known.
- **Standard unweighted PoA rejected** — doesn't support statutory-role differentiation
  (specifically, restricting `revoke()` to the Governor role).
- **QBFT chosen** — deterministic finality suited to statutory transactions.
- **DPoS component** — validator weighting reflects institutional role (Governor > Registrar > Citizen).

## Test Accounts (Development Only — Never Use in Production)

| Role | Address | Private Key |
|------|---------|-------------|
| Deployer / Registrar | 0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73 | 8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63 |
| Governor | 0x627306090abaB3A6e1400e9345bC60c78a8BEf57 | c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3 |
| Test Owner | 0xf17f52151EbEF6C7334FAD080c5704D77216b732 | ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f |

## Generating New Keys for Production

```bash
# Generate a new validator key pair
docker run --rm hyperledger/besu:24.3 \
  operator generate-blockchain-config \
  --config-file=/config/qbftConfigFile.json \
  --to=/config/networkFiles \
  --private-key-file-name=key
```

## Connecting Hardhat to This Node

In `contracts/hardhat.config.ts`:
```typescript
besu_local: {
  url: "http://localhost:8545",
  chainId: 1337,
  accounts: ["0x8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63"]
}
```
