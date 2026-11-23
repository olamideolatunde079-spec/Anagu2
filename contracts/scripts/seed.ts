/**
 * Anagu — Contract Seed Script
 *
 * Seeds the deployed LandTitleNFT and LandRegistry with test data:
 *  1. Reads deployment addresses from deployments/besu_local.json
 *  2. Issues 5 test NFT titles (different owners and parcel IDs)
 *  3. Prints each tokenId and txHash
 *  4. Issues a 6th title then immediately revokes it (ground 0 = OverridingPublicInterest)
 *  5. Confirms revocation with isRevoked()
 *
 * Usage:
 *   npx hardhat run scripts/seed.ts --network besu_local
 *   npx hardhat run scripts/seed.ts --network hardhat
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
}

// Minimal ABI fragments for seeding
const LAND_REGISTRY_ABI = [
  "function registerTitle(address owner, string parcelId, bytes32 spatialHash, string tokenURI) external returns (uint256)",
];

const LAND_TITLE_NFT_ABI = [
  "function revoke(uint256 tokenId, uint8 ground) external",
  "function isRevoked(uint256 tokenId) external view returns (bool)",
  "function totalSupply() external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function grantRole(bytes32 role, address account) external",
  "function GOVERNOR_ROLE() external view returns (bytes32)",
];

async function main() {
  console.log(`\n🌱 Seeding Anagu test data on network: ${network.name}`);
  console.log("─".repeat(60));

  // ── Load deployment addresses ──────────────────────────────────────────
  const deploymentsDir  = path.resolve(__dirname, "../deployments");
  const deploymentFile  = path.join(deploymentsDir, `${network.name}.json`);

  if (!fs.existsSync(deploymentFile)) {
    throw new Error(
      `Deployment file not found: ${deploymentFile}\n` +
      `Run "npx hardhat run scripts/deploy.ts --network ${network.name}" first.`
    );
  }

  const deployment: DeploymentFile = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const { LandTitleNFT, LandRegistry } = deployment.contracts;

  console.log(`   LandTitleNFT : ${LandTitleNFT.address}`);
  console.log(`   LandRegistry : ${LandRegistry.address}`);
  console.log(`   Governor     : ${deployment.governor}`);
  console.log("");

  const [deployer, governor, owner1, owner2, owner3] = await ethers.getSigners();

  const landRegistry = new ethers.Contract(LandRegistry.address, LAND_REGISTRY_ABI, deployer);
  const landTitleNFT = new ethers.Contract(LandTitleNFT.address, LAND_TITLE_NFT_ABI, deployer);

  // ── Test parcel data ───────────────────────────────────────────────────
  const testParcels = [
    {
      owner:       owner1?.address ?? deployer.address,
      parcelId:    "parcel-lagos-ikeja-001",
      wkt:         "POLYGON((3.35 6.56, 3.36 6.56, 3.36 6.57, 3.35 6.57, 3.35 6.56))",
      tokenURI:    "ipfs://QmTestSeed001",
    },
    {
      owner:       owner2?.address ?? deployer.address,
      parcelId:    "parcel-lagos-victoria-002",
      wkt:         "POLYGON((3.42 6.43, 3.43 6.43, 3.43 6.44, 3.42 6.44, 3.42 6.43))",
      tokenURI:    "ipfs://QmTestSeed002",
    },
    {
      owner:       owner3?.address ?? deployer.address,
      parcelId:    "parcel-abuja-central-003",
      wkt:         "POLYGON((7.49 9.05, 7.50 9.05, 7.50 9.06, 7.49 9.06, 7.49 9.05))",
      tokenURI:    "ipfs://QmTestSeed003",
    },
    {
      owner:       deployer.address,
      parcelId:    "parcel-kano-nassarawa-004",
      wkt:         "POLYGON((8.52 12.00, 8.53 12.00, 8.53 12.01, 8.52 12.01, 8.52 12.00))",
      tokenURI:    "ipfs://QmTestSeed004",
    },
    {
      owner:       deployer.address,
      parcelId:    "parcel-port-harcourt-005",
      wkt:         "POLYGON((7.01 4.82, 7.02 4.82, 7.02 4.83, 7.01 4.83, 7.01 4.82))",
      tokenURI:    "ipfs://QmTestSeed005",
    },
  ];

  // ── Issue 5 titles ────────────────────────────────────────────────────
  console.log("Issuing 5 test land title NFTs...\n");

  const issued: { parcelId: string; tokenId: string; txHash: string; owner: string }[] = [];

  for (const parcel of testParcels) {
    const spatialHash = ethers.keccak256(ethers.toUtf8Bytes(parcel.wkt));

    const tx      = await landRegistry.registerTitle(
      parcel.owner,
      parcel.parcelId,
      spatialHash,
      parcel.tokenURI,
    );
    const receipt = await tx.wait();

    // Parse tokenId from RegistrationRecorded event log
    const totalSupply = await landTitleNFT.totalSupply();
    const tokenId     = totalSupply.toString();

    console.log(`   ✅ Issued tokenId=${tokenId}`);
    console.log(`      parcelId  : ${parcel.parcelId}`);
    console.log(`      owner     : ${parcel.owner}`);
    console.log(`      txHash    : ${receipt.hash}`);
    console.log("");

    issued.push({ parcelId: parcel.parcelId, tokenId, txHash: receipt.hash, owner: parcel.owner });
  }

  // ── Issue a 6th title then revoke it ──────────────────────────────────
  console.log("Issuing 6th title (to be revoked)...");

  const revokeParcel = {
    owner:    deployer.address,
    parcelId: "parcel-revoke-test-006",
    wkt:      "POLYGON((3.00 6.00, 3.01 6.00, 3.01 6.01, 3.00 6.01, 3.00 6.00))",
    tokenURI: "ipfs://QmTestSeed006Revoked",
  };

  const spatialHash6 = ethers.keccak256(ethers.toUtf8Bytes(revokeParcel.wkt));
  const tx6          = await landRegistry.registerTitle(
    revokeParcel.owner,
    revokeParcel.parcelId,
    spatialHash6,
    revokeParcel.tokenURI,
  );
  const receipt6 = await tx6.wait();
  const tokenId6 = (await landTitleNFT.totalSupply()).toString();

  console.log(`   ✅ Issued tokenId=${tokenId6}, txHash=${receipt6.hash}`);

  // Ensure governor role is on the right signer
  const GOVERNOR_ROLE    = await landTitleNFT.GOVERNOR_ROLE();
  const governorSigner   = governor ?? deployer;

  // Grant GOVERNOR_ROLE to our signer if needed (deployer is admin)
  const grantTx = await landTitleNFT.grantRole(GOVERNOR_ROLE, governorSigner.address);
  await grantTx.wait();

  // Revoke the 6th title (ground 0 = OverridingPublicInterest)
  console.log(`\nRevoking tokenId=${tokenId6} (ground: OverridingPublicInterest)...`);
  const landTitleNFTAsGovernor = landTitleNFT.connect(governorSigner) as typeof landTitleNFT;
  const revokeTx   = await landTitleNFTAsGovernor.revoke(BigInt(tokenId6), 0);
  const revokeReceipt = await revokeTx.wait();
  console.log(`   ✅ Revoked. txHash=${revokeReceipt.hash}`);

  // Confirm revocation
  const isRevoked = await landTitleNFT.isRevoked(BigInt(tokenId6));
  console.log(`   isRevoked(${tokenId6}) = ${isRevoked}`);

  if (!isRevoked) {
    throw new Error(`❌ Revocation check FAILED — isRevoked(${tokenId6}) returned false`);
  }

  // ── Print summary ──────────────────────────────────────────────────────
  console.log("\n─".repeat(60));
  console.log("✅ Seeding complete!\n");
  console.table([
    ...issued.map((t) => ({ tokenId: t.tokenId, parcelId: t.parcelId, status: 'ACTIVE', txHash: t.txHash.slice(0, 18) + '...' })),
    { tokenId: tokenId6, parcelId: revokeParcel.parcelId, status: 'REVOKED', txHash: revokeReceipt.hash.slice(0, 18) + '...' },
  ]);
  console.log("");
}

main().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exitCode = 1;
});
