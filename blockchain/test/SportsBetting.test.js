const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Sports Betting Oracle System", function () {
  let SportsOracle;
  let oracle;
  let BettingMarket;
  let bettingMarket;
  let owner;
  let otherAccount;
  let bettor;

  const MATCH_ID = 1;
  const PLAYER_ID = 101;
  const PREDICTED_VALUE = 20;
  const POINTS_SCORED_WIN = 25;
  const POINTS_SCORED_LOSS = 15;

  beforeEach(async function () {
    [owner, otherAccount, bettor] = await ethers.getSigners();

    SportsOracle = await ethers.getContractFactory("SportsOracle");
    oracle = await SportsOracle.deploy();
    await oracle.waitForDeployment();

    BettingMarket = await ethers.getContractFactory("BettingMarket");
    bettingMarket = await BettingMarket.deploy(await oracle.getAddress());
    await bettingMarket.waitForDeployment();
  });

  describe("SportsOracle", function () {
    it("Should set the correct oracle address", async function () {
      expect(await oracle.oracleAddress()).to.equal(owner.address);
    });

    it("Should allow the oracle to submit player performance", async function () {
      await expect(oracle.submitPlayerData(MATCH_ID, PLAYER_ID, POINTS_SCORED_WIN))
        .to.emit(oracle, "DataSubmitted")
        .withArgs(MATCH_ID, PLAYER_ID);

      const performance = await oracle.performances(MATCH_ID, PLAYER_ID);
      expect(performance.pointsScored).to.equal(POINTS_SCORED_WIN);
      expect(performance.finalized).to.be.false;
    });

    it("Should fail if non-oracle tries to submit data", async function () {
      await expect(oracle.connect(otherAccount).submitPlayerData(MATCH_ID, PLAYER_ID, POINTS_SCORED_WIN))
        .to.be.revertedWith("Only oracle can call");
    });

    it("Should allow the oracle to finalize match data", async function () {
      await expect(oracle.finalizeMatch(MATCH_ID, PLAYER_ID))
        .to.emit(oracle, "DataFinalized")
        .withArgs(MATCH_ID, PLAYER_ID);

      const performance = await oracle.performances(MATCH_ID, PLAYER_ID);
      expect(performance.finalized).to.be.true;
    });

    it("Should fail to submit data after finalization", async function () {
      await oracle.finalizeMatch(MATCH_ID, PLAYER_ID);
      await expect(oracle.submitPlayerData(MATCH_ID, PLAYER_ID, 30))
        .to.be.revertedWith("Data already finalized");
    });
  });

  describe("BettingMarket", function () {
    it("Should set the correct oracle contract", async function () {
      expect(await bettingMarket.oracle()).to.equal(await oracle.getAddress());
    });

    it("Should allow placing a bet", async function () {
      const betAmount = ethers.parseEther("1.0");
      
      await expect(bettingMarket.connect(bettor).placeBet(MATCH_ID, PLAYER_ID, PREDICTED_VALUE, { value: betAmount }))
        .to.emit(bettingMarket, "BetPlaced")
        .withArgs(0, bettor.address, betAmount);

      const bet = await bettingMarket.bets(0);
      expect(bet.bettor).to.equal(bettor.address);
      expect(bet.amount).to.equal(betAmount);
      expect(bet.settled).to.be.false;
    });

    it("Should fail to place bet with 0 ETH", async function () {
      await expect(bettingMarket.connect(bettor).placeBet(MATCH_ID, PLAYER_ID, PREDICTED_VALUE, { value: 0 }))
        .to.be.revertedWith("Bet amount must be greater than 0");
    });

    it("Should fail to place bet if match is finalized", async function () {
      await oracle.finalizeMatch(MATCH_ID, PLAYER_ID);
      const betAmount = ethers.parseEther("1.0");
      await expect(bettingMarket.connect(bettor).placeBet(MATCH_ID, PLAYER_ID, PREDICTED_VALUE, { value: betAmount }))
        .to.be.revertedWith("Match already finalized");
    });

    it("Should settle a winning bet", async function () {
      const betAmount = ethers.parseEther("1.0");
      await bettingMarket.connect(bettor).placeBet(MATCH_ID, PLAYER_ID, PREDICTED_VALUE, { value: betAmount });

      // Deposit some ETH to contract for payout (contract needs 2 * betAmount)
      await owner.sendTransaction({
        to: await bettingMarket.getAddress(),
        value: ethers.parseEther("10.0")
      });

      await oracle.submitPlayerData(MATCH_ID, PLAYER_ID, POINTS_SCORED_WIN);
      await oracle.finalizeMatch(MATCH_ID, PLAYER_ID);

      const initialBettorBalance = await ethers.provider.getBalance(bettor.address);

      await expect(bettingMarket.settleBet(0))
        .to.emit(bettingMarket, "BetSettled")
        .withArgs(0, bettor.address, true, betAmount * 2n);

      const finalBettorBalance = await ethers.provider.getBalance(bettor.address);
      expect(finalBettorBalance).to.be.gt(initialBettorBalance);
      
      const bet = await bettingMarket.bets(0);
      expect(bet.settled).to.be.true;
    });

    it("Should settle a losing bet", async function () {
      const betAmount = ethers.parseEther("1.0");
      await bettingMarket.connect(bettor).placeBet(MATCH_ID, PLAYER_ID, PREDICTED_VALUE, { value: betAmount });

      await oracle.submitPlayerData(MATCH_ID, PLAYER_ID, POINTS_SCORED_LOSS);
      await oracle.finalizeMatch(MATCH_ID, PLAYER_ID);

      await expect(bettingMarket.settleBet(0))
        .to.emit(bettingMarket, "BetSettled")
        .withArgs(0, bettor.address, false, 0);

      const bet = await bettingMarket.bets(0);
      expect(bet.settled).to.be.true;
    });

    it("Should fail to settle if not finalized", async function () {
      const betAmount = ethers.parseEther("1.0");
      await bettingMarket.connect(bettor).placeBet(MATCH_ID, PLAYER_ID, PREDICTED_VALUE, { value: betAmount });

      await expect(bettingMarket.settleBet(0))
        .to.be.revertedWith("Match not yet finalized");
    });

    it("Should fail to settle twice", async function () {
      const betAmount = ethers.parseEther("1.0");
      await bettingMarket.connect(bettor).placeBet(MATCH_ID, PLAYER_ID, PREDICTED_VALUE, { value: betAmount });

      await oracle.finalizeMatch(MATCH_ID, PLAYER_ID);
      await bettingMarket.settleBet(0);

      await expect(bettingMarket.settleBet(0))
        .to.be.revertedWith("Bet already settled");
    });
  });
});
