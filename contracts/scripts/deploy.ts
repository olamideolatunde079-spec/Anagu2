import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deployment script for Anagu smart contracts.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network polygon_amoy
 *   npx hardhat run scripts/deploy.ts --network besu_local
 *   npx hardhat run scripts/deploy.ts --network hardhat
 *
 * After deployment, contract addresses are written to:
 *   deployments/<networkName>.json
 */
async function main() {
  const netInfo = await ethers.provider.getNetwork();
  if (netInfo.chainId === 137n) {
    throw new Error("Polygon Mainnet (chainId 137) deployment is strictly disabled in this phase. Use polygon_amoy (80002) or hardhat.");
  }

  console.log(`\n🚀 Deploying Anagu contracts to network: ${network.name} (chainId ${netInfo.chainId})`);
  console.log("─".repeat(60));

  const [deployer, governor] = await ethers.getSigners();

  console.log(`📋 Deployer address  : ${deployer.address}`);
  console.log(`📋 Governor address  : ${governor?.address ?? "same as deployer (single signer)"}`);

  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  const symbol = netInfo.chainId === 80002n ? "POL" : "ETH";
  console.log(`💰 Deployer balance  : ${ethers.formatEther(deployerBalance)} ${symbol}\n`);

  // ── 1. Deploy LandTitleNFT ────────────────────────────────────────────
  console.log("1. Deploying LandTitleNFT...");
  const LandTitleNFTFactory = await ethers.getContractFactory("LandTitleNFT");
  const landTitleNFT = await LandTitleNFTFactory.deploy(deployer.address);
  await landTitleNFT.waitForDeployment();
  const nftAddress = await landTitleNFT.getAddress();
  console.log(`   ✅ LandTitleNFT deployed to: ${nftAddress}`);

  // ── 2. Deploy LandRegistry ────────────────────────────────────────────
  console.log("2. Deploying LandRegistry...");
  const LandRegistryFactory = await ethers.getContractFactory("LandRegistry");
  const landRegistry = await LandRegistryFactory.deploy(nftAddress, deployer.address);
  await landRegistry.waitForDeployment();
  const registryAddress = await landRegistry.getAddress();
  console.log(`   ✅ LandRegistry deployed to: ${registryAddress}`);

  // ── 3. Grant LandRegistry the REGISTRAR_ROLE on LandTitleNFT ─────────
  console.log("3. Granting REGISTRAR_ROLE to LandRegistry on LandTitleNFT...");
  const REGISTRAR_ROLE = await landTitleNFT.REGISTRAR_ROLE();
  const grantTx = await landTitleNFT.grantRole(REGISTRAR_ROLE, registryAddress);
  await grantTx.wait();
  console.log(`   ✅ REGISTRAR_ROLE granted to LandRegistry`);

  // ── 4. Grant GOVERNOR_ROLE to governor address ────────────────────────
  const governorAddress = governor?.address ?? deployer.address;
  console.log(`4. Granting GOVERNOR_ROLE to: ${governorAddress}...`);
  const GOVERNOR_ROLE = await landTitleNFT.GOVERNOR_ROLE();
  const govTx = await landTitleNFT.grantRole(GOVERNOR_ROLE, governorAddress);
  await govTx.wait();
  console.log(`   ✅ GOVERNOR_ROLE granted`);

  // ── 5. Save deployment addresses ─────────────────────────────────────
  const deployment = {
    network:       network.name,
    chainId:       (await ethers.provider.getNetwork()).chainId.toString(),
    deployedAt:    new Date().toISOString(),
    deployer:      deployer.address,
    governor:      governorAddress,
    contracts: {
      LandTitleNFT: {
        address: nftAddress,
        constructorArgs: [deployer.address],
      },
      LandRegistry: {
        address: registryAddress,
        constructorArgs: [nftAddress, deployer.address],
      },
    },
  };

  const deploymentsDir = path.resolve(__dirname, "../deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  const outFile = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2));

  console.log(`\n📄 Deployment info saved to: ${outFile}`);
  console.log("\n─".repeat(60));
  console.log("✅ Deployment complete!\n");
  console.log("Add these to your .env file:");
  console.log(`   LAND_TITLE_NFT_ADDRESS=${nftAddress}`);
  console.log(`   LAND_REGISTRY_ADDRESS=${registryAddress}`);
  console.log("");

  return deployment;
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
