// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SportsOracle.sol";

/**
 * @title BettingMarket
 * @dev Contract for placing and settling bets based on SportsOracle data.
 */
contract BettingMarket {
    SportsOracle public oracle;

    struct Bet {
        address bettor;
        uint256 amount;
        bool settled;
        uint256 matchId;
        uint256 playerId;
        uint256 predictedValue;
    }

    uint256 public nextBetId;
    mapping(uint256 => Bet) public bets;

    event BetPlaced(uint256 indexed betId, address indexed bettor, uint256 amount);
    event BetSettled(uint256 indexed betId, address indexed bettor, bool won, uint256 payout);

    constructor(address _oracleAddress) {
        oracle = SportsOracle(_oracleAddress);
    }

    /**
     * @dev Allows users to place bets by sending Ether.
     */
    function placeBet(uint256 matchId, uint256 playerId, uint256 predictedValue) external payable {
        require(msg.value > 0, "Bet amount must be greater than 0");
        
        // Check if the match is already finalized in the oracle
        ( , bool finalized) = oracle.performances(matchId, playerId);
        require(!finalized, "Match already finalized");

        bets[nextBetId] = Bet({
            bettor: msg.sender,
            amount: msg.value,
            settled: false,
            matchId: matchId,
            playerId: playerId,
            predictedValue: predictedValue
        });

        emit BetPlaced(nextBetId, msg.sender, msg.value);
        nextBetId++;
    }

    /**
     * @dev Settles a bet after a match is finalized.
     */
    function settleBet(uint256 betId) external {
        Bet storage bet = bets[betId];
        require(!bet.settled, "Bet already settled");

        // Fetch actual performance and finalized status from oracle
        (uint256 actualPoints, bool finalized) = oracle.performances(bet.matchId, bet.playerId);
        require(finalized, "Match not yet finalized");

        bool won = actualPoints > bet.predictedValue;
        uint256 payout = 0;

        if (won) {
            payout = bet.amount * 2;
            require(address(this).balance >= payout, "Insufficient contract balance for payout");
            payable(bet.bettor).transfer(payout);
        }

        bet.settled = true;
        
        emit BetSettled(betId, bet.bettor, won, payout);
    }

    /**
     * @dev Recovery function to deposit ETH to the contract for payouts if needed.
     */
    receive() external payable {}
}
