import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import SportsOracleABI from './abi/SportsOracle.json';
import BettingMarketABI from './abi/BettingMarket.json';
import './index.css';

function App() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState({ BettingMarket: '' });
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [placedBets, setPlacedBets] = useState([]);
  const [betInputs, setBetInputs] = useState({});
  const [marketStatuses, setMarketStatuses] = useState({});

  const demoMarkets = [
    { id: 1, match: "Lakers vs Warriors", player: "LeBron James", matchId: 101, playerId: 1 },
    { id: 2, match: "Nets vs Celtics", player: "Kevin Durant", matchId: 102, playerId: 2 },
  ];

  const showToast = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(prev => prev.message === message ? { message: '', type: '' } : prev);
    }, 5000);
  };

  const getMarketDetails = (matchId, playerId) => {
    const market = demoMarkets.find(m => m.matchId === matchId && m.playerId === playerId);
    return market ? `${market.player} (${market.match})` : `Match ${matchId}, Player ${playerId}`;
  };

  const getBetInput = (matchId, playerId) => {
    const key = `${matchId}-${playerId}`;
    return betInputs[key] || { predictedValue: '10', betAmount: '0.01' };
  };

  const setBetInput = (matchId, playerId, field, val) => {
    const key = `${matchId}-${playerId}`;
    setBetInputs(prev => ({
      ...prev,
      [key]: {
        ...getBetInput(matchId, playerId),
        [field]: val
      }
    }));
  };

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const response = await fetch('/shared/deployed-addresses.json');
        const data = await response.json();
        setAddresses(data);
      } catch (error) {
        console.error('Error fetching addresses:', error);
      }
    };
    fetchAddresses();
  }, []);

  const fetchPlacedBets = async (activeContract) => {
    const targetContract = activeContract || contract;
    if (!targetContract) return;
    try {
      const nextBetId = await targetContract.nextBetId();
      const count = Number(nextBetId);
      const betsList = [];
      for (let i = 0; i < count; i++) {
        const bet = await targetContract.bets(i);
        betsList.push({
          id: i,
          bettor: bet[0],
          amount: ethers.formatEther(bet[1]),
          settled: bet[2],
          matchId: Number(bet[3]),
          playerId: Number(bet[4]),
          predictedValue: Number(bet[5])
        });
      }
      setPlacedBets(betsList);
    } catch (error) {
      console.error("Error fetching bets:", error);
    }
  };

  const fetchMarketStatuses = async (activeContract) => {
    const targetContract = activeContract || contract;
    if (!targetContract) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const oracleAddr = await targetContract.oracle();
      const oracleContract = new ethers.Contract(oracleAddr, SportsOracleABI.abi, provider);
      
      const statuses = {};
      for (const market of demoMarkets) {
        const perf = await oracleContract.performances(market.matchId, market.playerId);
        statuses[`${market.matchId}-${market.playerId}`] = {
          pointsScored: Number(perf[0]),
          finalized: perf[1]
        };
      }
      setMarketStatuses(statuses);
    } catch (error) {
      console.error("Error fetching market statuses:", error);
    }
  };

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
        showToast("Wallet connected successfully!", "success");
        await fetchPlacedBets(bettingContract);
        await fetchMarketStatuses(bettingContract);
      } catch (error) {
        console.error("Connection error:", error);
        showToast("Failed to connect wallet.", "error");
      }
    } else {
      showToast("Please install MetaMask!", "warning");
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      const handleAccounts = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          if (addresses.BettingMarket) {
            connectWallet();
          }
        } else {
          setAccount('');
          setContract(null);
          setPlacedBets([]);
          setMarketStatuses({});
        }
      };
      window.ethereum.on('accountsChanged', handleAccounts);
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccounts);
      };
    }
  }, [addresses]);

  useEffect(() => {
    if (!contract) return;

    fetchPlacedBets(contract);
    fetchMarketStatuses(contract);

    const onBetPlaced = (betId, bettor, amount) => {
      console.log(`Event: BetPlaced #${betId} by ${bettor}`);
      fetchPlacedBets(contract);
      if (bettor.toLowerCase() === account.toLowerCase()) {
        showToast(`Bet #${betId} of ${ethers.formatEther(amount)} ETH placed successfully!`, "success");
      } else {
        showToast(`New bet placed on the platform: #${betId}`, "info");
      }
    };

    const onBetSettled = (betId, bettor, won, payout) => {
      console.log(`Event: BetSettled #${betId} - Won: ${won}`);
      fetchPlacedBets(contract);
      if (bettor.toLowerCase() === account.toLowerCase()) {
        if (won) {
          showToast(`Congratulations! You won Bet #${betId}! Payout: ${ethers.formatEther(payout)} ETH`, "success");
        } else {
          showToast(`Bet #${betId} settled. Prediction was incorrect. Better luck next time!`, "info");
        }
      } else {
        showToast(`Bet #${betId} settled: ${won ? 'Won' : 'Lost'}`, "info");
      }
    };

    contract.on("BetPlaced", onBetPlaced);
    contract.on("BetSettled", onBetSettled);

    let oracleContract;
    const setupOracleListeners = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const oracleAddr = await contract.oracle();
        oracleContract = new ethers.Contract(oracleAddr, SportsOracleABI.abi, provider);

        const onDataSubmitted = (matchId, playerId) => {
          console.log(`Event: DataSubmitted for Match ${matchId}, Player ${playerId}`);
          fetchMarketStatuses(contract);
          showToast(`Oracle submitted new data for Match ${matchId}, Player ${playerId}`, "info");
        };

        const onDataFinalized = (matchId, playerId) => {
          console.log(`Event: DataFinalized for Match ${matchId}, Player ${playerId}`);
          fetchMarketStatuses(contract);
          showToast(`Match ${matchId}, Player ${playerId} finalized by Oracle!`, "warning");
        };

        oracleContract.on("DataSubmitted", onDataSubmitted);
        oracleContract.on("DataFinalized", onDataFinalized);
      } catch (e) {
        console.error("Oracle listeners setup failed:", e);
      }
    };
    setupOracleListeners();

    return () => {
      contract.off("BetPlaced", onBetPlaced);
      contract.off("BetSettled", onBetSettled);
      if (oracleContract) {
        oracleContract.removeAllListeners();
      }
    };
  }, [contract, account]);

  const placeBet = async (matchId, playerId) => {
    if (!contract) return showToast("Please connect wallet first", "warning");

    const inputs = getBetInput(matchId, playerId);
    if (!inputs.predictedValue || Number(inputs.predictedValue) <= 0) {
      return showToast("Please enter a valid predicted value", "warning");
    }
    if (!inputs.betAmount || Number(inputs.betAmount) <= 0) {
      return showToast("Please enter a valid bet amount", "warning");
    }

    setLoading(true);
    try {
      showToast("Confirming transaction in wallet...", "info");
      const tx = await contract.placeBet(matchId, playerId, inputs.predictedValue, {
        value: ethers.parseEther(inputs.betAmount)
      });
      showToast("Transaction submitted. Waiting for confirmation...", "info");
      await tx.wait();
    } catch (error) {
      console.error("Betting error:", error);
      showToast("Error placing bet: " + (error.reason || error.message), "error");
    } finally {
      setLoading(false);
    }
  };

  const settleBet = async (betId) => {
    if (!contract) return showToast("Please connect wallet first", "warning");

    setLoading(true);
    try {
      showToast(`Settling bet #${betId}. Confirming in wallet...`, "info");
      const tx = await contract.settleBet(betId);
      showToast("Settlement transaction submitted. Waiting for confirmation...", "info");
      await tx.wait();
    } catch (error) {
      console.error("Settlement error:", error);
      showToast("Error settling bet: " + (error.reason || error.message), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      {notification.message && (
        <div className={`toast-notification ${notification.type}`}>
          <div className="toast-content">
            <span className="toast-icon">
              {notification.type === 'success' && '✓'}
              {notification.type === 'error' && '✗'}
              {notification.type === 'warning' && '⚠'}
              {notification.type === 'info' && 'ℹ'}
            </span>
            <span className="toast-message">{notification.message}</span>
          </div>
          <button className="toast-close" onClick={() => setNotification({ message: '', type: '' })}>×</button>
        </div>
      )}

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
          {demoMarkets.map((market) => {
            const key = `${market.matchId}-${market.playerId}`;
            const inputs = getBetInput(market.matchId, market.playerId);
            const status = marketStatuses[key] || { pointsScored: 0, finalized: false };

            return (
              <div key={market.id} className="market-card">
                <div className="market-header">
                  <h3>{market.match}</h3>
                  <span className={`status-badge ${status.finalized ? 'finalized' : 'live'}`} style={{
                    backgroundColor: status.finalized ? 'rgba(255, 0, 85, 0.1)' : 'rgba(0, 255, 136, 0.1)',
                    color: status.finalized ? 'var(--danger)' : 'var(--success)',
                    border: `1px solid ${status.finalized ? 'var(--danger)' : 'var(--success)'}`
                  }}>
                    {status.finalized ? 'FINALIZED' : 'LIVE'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
                  Player: <strong>{market.player}</strong>
                </p>

                {/* Display Current Oracle Data */}
                <div className="oracle-stats" style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  padding: '0.8rem',
                  borderRadius: '12px',
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                  border: '1px dashed var(--glass-border)'
                }}>
                  <p style={{ margin: '0 0 0.3rem 0', color: 'var(--text-secondary)' }}>
                    Oracle Score: <strong style={{ color: 'var(--text-primary)' }}>{status.pointsScored} pts</strong>
                  </p>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                    Settlement: <strong style={{ color: status.finalized ? 'var(--success)' : '#ffaa00' }}>
                      {status.finalized ? 'Ready to Settle' : 'Awaiting Finalization'}
                    </strong>
                  </p>
                </div>

                <div className="bet-input-group">
                  <label>Predicted Points</label>
                  <input
                    type="number"
                    value={inputs.predictedValue}
                    onChange={(e) => setBetInput(market.matchId, market.playerId, 'predictedValue', e.target.value)}
                    disabled={status.finalized}
                  />
                  <label>Wager (ETH)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={inputs.betAmount}
                    onChange={(e) => setBetInput(market.matchId, market.playerId, 'betAmount', e.target.value)}
                    disabled={status.finalized}
                  />
                </div>

                <button
                  className="bet-btn"
                  onClick={() => placeBet(market.matchId, market.playerId)}
                  disabled={loading || !account || status.finalized}
                  data-test-id={`place-bet-button-${market.matchId}-${market.playerId}`}
                >
                  {loading ? "Processing..." : (status.finalized ? "Market Closed" : "Place Bet")}
                </button>
              </div>
            );
          })}
        </section>

        {placedBets.length > 0 && (
          <section className="bets-section" style={{ marginTop: '4rem' }}>
            <h2 style={{ marginBottom: '2rem', textAlign: 'center', fontSize: '2rem' }}>Your Placed Bets</h2>
            <div className="bets-grid">
              {placedBets.map((bet) => (
                <div key={bet.id} className="bet-card">
                  <div className="bet-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h4>Bet #{bet.id}</h4>
                    <span className={`status-badge ${bet.settled ? 'settled' : 'active'}`} style={{
                      backgroundColor: bet.settled ? 'rgba(0, 255, 136, 0.1)' : 'rgba(0, 242, 255, 0.1)',
                      color: bet.settled ? 'var(--success)' : 'var(--primary-accent)',
                      border: `1px solid ${bet.settled ? 'var(--success)' : 'var(--primary-accent)'}`
                    }}>
                      {bet.settled ? 'Settled' : 'Active'}
                    </span>
                  </div>
                  <div className="bet-details" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                    <p><strong>Market:</strong> {getMarketDetails(bet.matchId, bet.playerId)}</p>
                    <p><strong>Wager:</strong> {bet.amount} ETH</p>
                    <p><strong>Prediction:</strong> Over {bet.predictedValue} points</p>
                    <p style={{ wordBreak: 'break-all' }}><strong>Bettor:</strong> {bet.bettor.slice(0, 6)}...{bet.bettor.slice(-4)}</p>
                  </div>
                  {!bet.settled && (
                    <button 
                      className="settle-btn"
                      onClick={() => settleBet(bet.id)}
                      disabled={loading || !account}
                      style={{
                        width: '100%',
                        padding: '0.8rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'rgba(112, 0, 255, 0.2)',
                        color: '#b070ff',
                        border: '1px solid #7000ff',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.background = '#7000ff';
                          e.target.style.color = 'white';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(112, 0, 255, 0.2)';
                        e.target.style.color = '#b070ff';
                      }}
                    >
                      {loading ? "Processing..." : "Settle Bet"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
