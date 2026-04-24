const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts...");

  // Deploy SportsOracle
  const SportsOracle = await hre.ethers.getContractFactory("SportsOracle");
  const oracle = await SportsOracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log(`SportsOracle deployed to: ${oracleAddress}`);

  // Deploy BettingMarket
  const BettingMarket = await hre.ethers.getContractFactory("BettingMarket");
  const bettingMarket = await BettingMarket.deploy(oracleAddress);
  await bettingMarket.waitForDeployment();
  const bettingMarketAddress = await bettingMarket.getAddress();
  console.log(`BettingMarket deployed to: ${bettingMarketAddress}`);

  // Export addresses for other services
  const fs = require("fs");
  const path = require("path");
  const addresses = {
    SportsOracle: oracleAddress,
    BettingMarket: bettingMarketAddress
  };
  
  const outputPath = path.join(__dirname, "../deployed-addresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log("Addresses saved to:", outputPath);

  console.log("Deployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
