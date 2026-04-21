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

  console.log("Deployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
