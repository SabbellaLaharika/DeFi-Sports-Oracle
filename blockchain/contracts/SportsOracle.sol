// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SportsOracle
 * @dev Custom oracle for sports player performance data.
 */
contract SportsOracle {
    address public oracleAddress;

    struct PlayerPerformance {
        uint256 pointsScored;
        bool finalized;
    }

    // matchId => playerId => PlayerPerformance
    mapping(uint256 => mapping(uint256 => PlayerPerformance)) public performances;

    event DataSubmitted(uint256 indexed matchId, uint256 indexed playerId);
    event DataFinalized(uint256 indexed matchId, uint256 indexed playerId);

    modifier onlyOracle() {
        require(msg.sender == oracleAddress, "Only oracle can call");
        _;
    }

    constructor() {
        oracleAddress = msg.sender;
    }

    /**
     * @dev Allows the oracle to submit player performance data.
     */
    function submitPlayerData(uint256 matchId, uint256 playerId, uint256 pointsScored) external onlyOracle {
        require(!performances[matchId][playerId].finalized, "Data already finalized");
        
        performances[matchId][playerId].pointsScored = pointsScored;
        
        emit DataSubmitted(matchId, playerId);
    }

    /**
     * @dev Allows the oracle to finalize match data, preventing further updates.
     */
    function finalizeMatch(uint256 matchId, uint256 playerId) external onlyOracle {
        performances[matchId][playerId].finalized = true;
        
        emit DataFinalized(matchId, playerId);
    }
}
