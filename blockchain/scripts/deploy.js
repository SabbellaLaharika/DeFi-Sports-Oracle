const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying contracts...");

  const SportsOracle = await hre.ethers.getContractFactory("SportsOracle");
  const sportsOracle = await SportsOracle.deploy();
  await sportsOracle.waitForDeployment();
  const oracleAddress = await sportsOracle.getAddress();
  console.log("SportsOracle deployed to:", oracleAddress);

  const BettingMarket = await hre.ethers.getContractFactory("BettingMarket");
  const bettingMarket = await BettingMarket.deploy(oracleAddress);
  await bettingMarket.waitForDeployment();
  const bettingMarketAddress = await bettingMarket.getAddress();
  console.log("BettingMarket deployed to:", bettingMarketAddress);

  // Write to a shared folder that is mounted in Docker
  // We use ../shared because the script runs from the blockchain/ directory
  const sharedDir = path.join(__dirname, "../shared");
  console.log(`Writing to directory: ${sharedDir}`);
  if (!fs.existsSync(sharedDir)) {
    console.log("Directory does not exist, creating it...");
    fs.mkdirSync(sharedDir, { recursive: true });
  }

  const addresses = {
    SportsOracle: oracleAddress,
    BettingMarket: bettingMarketAddress,
  };

  const finalPath = path.join(sharedDir, "deployed-addresses.json");
  console.log(`Final file path: ${finalPath}`);

  fs.writeFileSync(
    finalPath,
    JSON.stringify(addresses, null, 2)
  );
  
  console.log("Addresses saved to shared folder.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
