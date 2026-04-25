const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const addressesPath = path.join(__dirname, "../shared/deployed-addresses.json");
  if (!fs.existsSync(addressesPath)) {
    console.error("deployed-addresses.json not found in shared folder. Make sure the containers are running.");
    return;
  }

  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  console.log("Checking Oracle at:", addresses.SportsOracle);

  const SportsOracle = await hre.ethers.getContractAt("SportsOracle", addresses.SportsOracle);

  // Check data for a sample match
  const matchId = 101;
  const playerId = 1;

  console.log(`Querying data for Match ${matchId}, Player ${playerId}...`);
  const data = await SportsOracle.getPlayerData(matchId, playerId);
  
  console.log("-----------------------------------------");
  console.log("ORACLE DATA ON-CHAIN:");
  console.log(`Match ID: ${data.matchId.toString()}`);
  console.log(`Player ID: ${data.playerId.toString()}`);
  console.log(`Value: ${data.value.toString()}`);
  console.log(`Timestamp: ${new Date(Number(data.timestamp) * 1000).toLocaleString()}`);
  console.log("-----------------------------------------");

  if (data.value.toString() === "0") {
    console.log("Result: No data submitted yet. Trigger the Oracle API to see this update!");
  } else {
    console.log("Result: Oracle data is LIVE on the blockchain!");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
