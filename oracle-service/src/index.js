require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');
const SportsOracleABI = require('./abi/SportsOracle.json').abi;

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3001;

// Initialize Ethers.js
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);
const oracleContract = new ethers.Contract(
  process.env.ORACLE_CONTRACT_ADDRESS,
  SportsOracleABI,
  wallet
);

/**
 * Healthcheck endpoint for Docker
 */
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

/**
 * POST /api/trigger-update
 * Triggers a data submission to the SportsOracle contract.
 */
app.post('/api/trigger-update', async (req, res) => {
  const { matchId, playerId, pointsScored } = req.body;

  if (matchId === undefined || playerId === undefined || pointsScored === undefined) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    console.log(`Triggering update for Match ${matchId}, Player ${playerId}, Points ${pointsScored}`);
    const tx = await oracleContract.submitPlayerData(matchId, playerId, pointsScored);
    const receipt = await tx.wait();

    res.status(200).json({
      message: 'Data submitted successfully',
      transactionHash: receipt.hash
    });
  } catch (error) {
    console.error('Error submitting data:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/trigger-finalize
 * Triggers match finalization in the SportsOracle contract.
 */
app.post('/api/trigger-finalize', async (req, res) => {
  const { matchId, playerId } = req.body;

  if (matchId === undefined || playerId === undefined) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    console.log(`Triggering finalization for Match ${matchId}, Player ${playerId}`);
    const tx = await oracleContract.finalizeMatch(matchId, playerId);
    const receipt = await tx.wait();

    res.status(200).json({
      message: 'Match finalized successfully',
      transactionHash: receipt.hash
    });
  } catch (error) {
    console.error('Error finalizing match:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Oracle service running on port ${PORT}`);
});
