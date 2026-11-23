import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as fs from "fs";
import * as path from "path";

// Load .env from monorepo root cleanly (without failing in workspace hoisting layouts)
const rootEnvPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(rootEnvPath)) {
  if (typeof (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile === "function") {
    (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(rootEnvPath);
  }
}

const DEPLOYER_KEY =
  process.env.DEPLOYER_PRIVATE_KEY ||
  "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63"; // local dev default only

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: false,
    },
  },

  networks: {
    // Local Hardhat in-process network (for fast automated tests)
    hardhat: {
      chainId: 31337,
      mining: {
        auto: true,
        interval: 0,
      },
    },

    // Approved Polygon PoS development & staging testnet (Polygon Amoy)
    polygon_amoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: [DEPLOYER_KEY],
      timeout: 60000,
    },

    // Legacy local Hyperledger Besu config retained for backwards compatibility
    besu_local: {
      url: process.env.BESU_RPC_URL || "http://localhost:8545",
      chainId: 1337,
      accounts: [DEPLOYER_KEY],
      gas: "auto",
      gasPrice: 0,
      timeout: 60000,
    },
  },

  etherscan: {
    apiKey: {
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
    ],
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
  },

  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },

  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
