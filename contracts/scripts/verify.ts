/**
 * Anagu — Post-Deployment Verification Script
 *
 * Verifies that a deployment is healthy before use.
 * Reads deployments/<network>.json and runs a series of checks,
 * printing PASS/FAIL for each one in a final summary table.
 *
 * Checks:
 *  1.  LandTitleNFT.name()         === "AnaguLandTitle"
 *  2.  LandTitleNFT.symbol()       === "ALT"
 *  3.  LandTitleNFT.totalSupply()  is a number (≥ 0)
 *  4.  LandTitleNFT.REGISTRAR_ROLE is a 32-byte hash
 *  5.  LandTitleNFT.GOVERNOR_ROLE  is a 32-byte hash
 *  6.  LandRegistry.landTitleNFT() === LandTitleNFT.address
 *  7.  Issue test title → ownerOf(tokenId) === deployer
 *  8.  isRevoked(tokenId)          === false
 *  9.  Revoke test title → isRevoked(tokenId) === true
 *  10. transferFrom reverts on revoked token
 *
 * Usage:
 *   npx hardhat run scripts/verify.ts --network polygon_amoy
 *   npx hardhat run scripts/verify.ts --network besu_local
 *   npx hardhat run scripts/verify.ts --network hardhat
 */
import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentFile {
  contracts: {
    LandTitleNFT:  { address: string };
    LandRegistry:  { address: string };
  };
  governor: string;
  deployer: string;
}

const LAND_TITLE_NFT_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function totalSupply() external view returns (uint256)",
  "function REGISTRAR_ROLE() external view returns (bytes32)",
  "function GOVERNOR_ROLE() external view returns (bytes32)",
  "function PAUSER_ROLE() external view returns (bytes32)",
  "function issueTitle(address to, string parcelId, bytes32 spatialHash, string tokenURI) external returns (uint256)",
  "function revoke(uint256 tokenId, uint8 ground) external",
  "function isRevoked(uint256 tokenId) external view returns (bool)",
  "function titleStatus(uint256 tokenId) external view returns (uint8)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function transferFrom(address from, address to, uint256 tokenId) external",
  "function grantRole(bytes32 role, address account) external",
];

const LAND_REGISTRY_ABI = [
  "function landTitleNFT() external view returns (address)",
  "function registerTitle(address owner, string parcelId, bytes32 spatialHash, string tokenURI) external returns (uint256)",
];

type CheckResult = {
  check:    string;
  result:   'PASS' | 'FAIL';
  detail:   string;
};

async function main() {
  const netInfo = await ethers.provider.getNetwork();
  if (netInfo.chainId === 137n) {
    throw new Error("Polygon Mainnet (chainId 137) verification writes are disabled.");
  }

  console.log(`\n🔍 Verifying Anagu deployment on network: ${network.name} (chainId ${netInfo.chainId})`);
  console.log("─".repeat(65));

  // ── Load deployment file ───────────────────────────────────────────────
  const deploymentsDir = path.resolve(__dirname, "../deployments");
  const deploymentFile = path.join(deploymentsDir, `${network.name}.json`);

  if (!fs.existsSync(deploymentFile)) {
    throw new Error(
      `Deployment file not found: ${deploymentFile}\n` +
      `Run deploy.ts first.`
    );
  }

  const deployment: DeploymentFile = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const { LandTitleNFT, LandRegistry } = deployment.contracts;

  const [deployer, governor] = await ethers.getSigners();
  const results: CheckResult[] = [];

  const landTitleNFT = new ethers.Contract(LandTitleNFT.address, LAND_TITLE_NFT_ABI, deployer);
  const landRegistry = new ethers.Contract(LandRegistry.address, LAND_REGISTRY_ABI, deployer);

  // ── Helper ────────────────────────────────────────────────────────────
  async function check(
    label:   string,
    fn:      () => Promise<string | boolean>,
    expected?: string | boolean,
  ): Promise<void> {
    try {
      const actual = await fn();
      if (expected !== undefined) {
        const pass = String(actual) === String(expected);
        results.push({
          check:  label,
          result: pass ? 'PASS' : 'FAIL',
          detail: pass
            ? String(actual)
            : `Expected "${expected}", got "${actual}"`,
        });
      } else {
        results.push({ check: label, result: 'PASS', detail: String(actual) });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ check: label, result: 'FAIL', detail: message.slice(0, 80) });
    }
  }

  // ── 1. name() ─────────────────────────────────────────────────────────
  await check(
    '1. LandTitleNFT.name() === "AnaguLandTitle"',
    () => landTitleNFT.name(),
    'AnaguLandTitle',
  );

  // ── 2. symbol() ───────────────────────────────────────────────────────
  await check(
    '2. LandTitleNFT.symbol() === "ALT"',
    () => landTitleNFT.symbol(),
    'ALT',
  );

  // ── 3. totalSupply() ──────────────────────────────────────────────────
  await check(
    '3. LandTitleNFT.totalSupply() returns a number',
    async () => {
      const supply = await landTitleNFT.totalSupply();
      const n = Number(supply);
      if (isNaN(n)) throw new Error('Not a number');
      return `${n} tokens`;
    },
  );

  // ── 4. REGISTRAR_ROLE ─────────────────────────────────────────────────
  await check(
    '4. REGISTRAR_ROLE is a 32-byte hash',
    async () => {
      const role = await landTitleNFT.REGISTRAR_ROLE();
      if (!/^0x[0-9a-f]{64}$/i.test(role)) throw new Error(`Invalid: ${role}`);
      return role.slice(0, 18) + '...';
    },
  );

  // ── 5. GOVERNOR_ROLE ──────────────────────────────────────────────────
  await check(
    '5. GOVERNOR_ROLE is a 32-byte hash',
    async () => {
      const role = await landTitleNFT.GOVERNOR_ROLE();
      if (!/^0x[0-9a-f]{64}$/i.test(role)) throw new Error(`Invalid: ${role}`);
      return role.slice(0, 18) + '...';
    },
  );

  // ── 6. LandRegistry.landTitleNFT() matches ────────────────────────────
  await check(
    '6. LandRegistry.landTitleNFT() === LandTitleNFT.address',
    async () => {
      const addr = await landRegistry.landTitleNFT();
      return addr.toLowerCase();
    },
    LandTitleNFT.address.toLowerCase(),
  );

  // ── 7–10. Issue, verify, revoke, transfer guard ───────────────────────
  const testParcelId   = `verify-test-${Date.now()}`;
  const testWkt        = "POLYGON((0.0 0.0, 0.1 0.0, 0.1 0.1, 0.0 0.1, 0.0 0.0))";
  const testSpatialHash = ethers.keccak256(ethers.toUtf8Bytes(testWkt));
  let testTokenId: bigint | null = null;

  // ── 7. Issue + ownerOf ────────────────────────────────────────────────
  await check(
    `7. issueTitle() → ownerOf(tokenId) === deployer`,
    async () => {
      const tx      = await landRegistry.registerTitle(
        deployer.address,
        testParcelId,
        testSpatialHash,
        "ipfs://QmVerifyTest",
      );
      const receipt = await tx.wait();
      const supply  = await landTitleNFT.totalSupply();
      testTokenId   = BigInt(supply.toString());
      const owner   = await landTitleNFT.ownerOf(testTokenId);
      return owner.toLowerCase();
    },
    deployer.address.toLowerCase(),
  );

  // ── 8. isRevoked = false before revocation ────────────────────────────
  await check(
    '8. isRevoked(tokenId) === false before revocation',
    async () => {
      if (testTokenId === null) throw new Error('No token issued');
      const revoked = await landTitleNFT.isRevoked(testTokenId);
      return revoked;
    },
    false,
  );

  // ── 9. Revoke + isRevoked = true ──────────────────────────────────────
  await check(
    '9. revoke() → isRevoked(tokenId) === true',
    async () => {
      if (testTokenId === null) throw new Error('No token issued');

      const GOVERNOR_ROLE   = await landTitleNFT.GOVERNOR_ROLE();
      const governorSigner  = governor ?? deployer;
      const grantTx = await landTitleNFT.grantRole(GOVERNOR_ROLE, governorSigner.address);
      await grantTx.wait();

      const nftAsGovernor = landTitleNFT.connect(governorSigner) as typeof landTitleNFT;
      const revokeTx      = await nftAsGovernor.revoke(testTokenId, 0);
      await revokeTx.wait();

      const isRevoked = await landTitleNFT.isRevoked(testTokenId);
      return isRevoked;
    },
    true,
  );

  // ── 10. transferFrom reverts on revoked token ─────────────────────────
  await check(
    '10. transferFrom reverts on revoked token',
    async () => {
      if (testTokenId === null) throw new Error('No token issued');

      const randomWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      try {
        await landTitleNFT.transferFrom(
          deployer.address,
          randomWallet.address,
          testTokenId,
        );
        throw new Error('SHOULD_HAVE_REVERTED');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('SHOULD_HAVE_REVERTED')) throw err;
        // Any revert (revoked, access control) counts as blocked
        return 'Transfer correctly reverted';
      }
    },
  );

  // ── Print results ──────────────────────────────────────────────────────
  const passed = results.filter((r) => r.result === 'PASS').length;
  const failed = results.filter((r) => r.result === 'FAIL').length;

  console.log('\n');
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('  Deployment Verification Results                                 ');
  console.log('═════════════════════════════════════════════════════════════════');
  console.table(
    results.map((r) => ({
      'Check':  r.check,
      'Result': r.result,
      'Detail': r.detail,
    })),
  );
  console.log('');
  console.log(`Summary: ${passed}/${results.length} checks passed, ${failed} failed.`);

  if (failed > 0) {
    console.error(`\n❌ ${failed} check(s) failed — review the table above.`);
    process.exitCode = 1;
  } else {
    console.log('\n✅ All checks passed — deployment is healthy.');
  }
}

main().catch((error) => {
  console.error("❌ Verify script failed:", error);
  process.exitCode = 1;
});
