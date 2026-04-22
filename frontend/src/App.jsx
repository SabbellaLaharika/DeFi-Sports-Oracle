import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import SportsOracleABI from './abi/SportsOracle.json';
import BettingMarketABI from './abi/BettingMarket.json';
import './index.css';

const BETTING_MARKET_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Default Hardhat address

function App() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [betAmount, setBetAmount] = useState('0.01');
  const [predictedValue, setPredictedValue] = useState('10');

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const bettingContract = new ethers.Contract(
          BETTING_MARKET_ADDRESS,
          BettingMarketABI.abi,
          signer
        );
        setContract(bettingContract);
      } catch (error) {
        console.error("Connection error:", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const placeBet = async (matchId, playerId) => {
    if (!contract) return alert("Please connect wallet first");
    
    setLoading(true);
    try {
      const tx = await contract.placeBet(matchId, playerId, predictedValue, {
        value: ethers.parseEther(betAmount)
      });
      await tx.wait();
      alert("Bet placed successfully!");
    } catch (error) {
      console.error("Betting error:", error);
      alert("Error placing bet: " + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  const demoMarkets = [
    { id: 1, match: "Lakers vs Warriors", player: "LeBron James", matchId: 101, playerId: 1 },
    { id: 2, match: "Nets vs Celtics", player: "Kevin Durant", matchId: 102, playerId: 2 },
  ];

  return (
    <div className="App">
      <nav className="navbar">
        <div className="logo">DEFI SPORTS ORACLE</div>
        {!account ? (
          <button 
            className="connect-btn" 
            onClick={connectWallet}
            data-test-id="connect-wallet-button"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="user-info" data-test-id="user-address">
            {account.slice(0, 6)}...{account.slice(-4)}
          </div>
        )}
      </nav>

      <main className="container">
        <header className="hero">
          <h1>Decentralized Sports Betting</h1>
          <p>Transparent, Secure, and Powered by On-Chain Oracles</p>
        </header>

        <section className="markets-grid">
          {demoMarkets.map((market) => (
            <div key={market.id} className="market-card">
              <div className="market-header">
                <h3>{market.match}</h3>
                <span className="status-badge">LIVE</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Player: <strong>{market.player}</strong>
              </p>
              
              <div className="bet-input-group">
                <label>Predicted Points</label>
                <input 
                  type="number" 
                  value={predictedValue} 
                  onChange={(e) => setPredictedValue(e.target.value)}
                />
                <label>Wager (ETH)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={betAmount} 
                  onChange={(e) => setBetAmount(e.target.value)}
                />
              </div>

              <button 
                className="bet-btn"
                onClick={() => placeBet(market.matchId, market.playerId)}
                disabled={loading || !account}
                data-test-id={`place-bet-button-${market.matchId}-${market.playerId}`}
              >
                {loading ? "Processing..." : "Place Bet"}
              </button>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default App;
