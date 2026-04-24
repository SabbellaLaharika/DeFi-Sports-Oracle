import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import SportsOracleABI from './abi/SportsOracle.json';
import BettingMarketABI from './abi/BettingMarket.json';
import './index.css';

const BETTING_MARKET_ADDRESS = import.meta.env.VITE_BETTING_MARKET_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

function App() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [betAmount, setBetAmount] = useState('0.01');
  const [predictedValue, setPredictedValue] = useState('10');
  const [addresses, setAddresses] = useState({ BettingMarket: '' });

  useEffect(() => {
    // Fetch addresses dynamically from the shared file served by the frontend container
    fetch('/deployed-addresses.json')
      .then(res => res.json())
      .then(data => {
        setAddresses(data);
        console.log("Loaded dynamic addresses:", data);
      })
      .catch(err => console.error("Could not load addresses.json:", err));
  }, []);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const bettingContract = new ethers.Contract(
          addresses.BettingMarket,
          BettingMarketABI.abi,
          signer
        );
        setContract(bettingContract);
      } catch (error) {
        console.error("Connection error:", error);
        alert("Failed to connect wallet.");
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
