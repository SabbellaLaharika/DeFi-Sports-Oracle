# 🏆 DeFi Sports Betting Oracle

A premium, containerized decentralized sports betting system featuring a signed Oracle service, smart-contract-based wagering, and a dynamic React frontend.

## 🚀 Key Features
- **Dynamic Address Synchronization**: Zero-config deployment. The system automatically aligns smart contract addresses across all services at runtime.
- **Signed Oracle Data**: Secure on-chain data submission using cryptographic signatures to prevent tampering.
- **Automated Orchestration**: Full system lifecycle managed via Docker Compose with integrated health checks.
- **Premium UI**: Modern React frontend with glassmorphism design and real-time transaction feedback.

## 🛠 Tech Stack
- **Smart Contracts**: Solidity, Hardhat
- **Oracle Service**: Node.js, Ethers.js
- **Frontend**: React (Vite), Vanilla CSS
- **Infrastructure**: Docker, Docker Compose

## 📦 Rapid Deployment

### Prerequisites
- Docker & Docker Compose
- MetaMask Browser Extension

### Setup
1. **Start the Stack**:
   ```bash
   docker compose up --build -d
   ```
2. **Configure MetaMask**:
   - Network Name: Hardhat Local
   - RPC URL: `http://localhost:8545`
   - Chain ID: `31337`
   - Currency: `ETH`

3. **Access the Application**:
   - Frontend: `http://localhost:5173`
   - Oracle Health: `http://localhost:3001/health`

## 🐳 Docker Hub Images
Images are maintained by **SabbellaLaharika**:
- `sabbellalaharika/defi-sports-oracle-hardhat`
- `sabbellalaharika/defi-sports-oracle-oracle`
- `sabbellalaharika/defi-sports-oracle-frontend`

## 📜 License
MIT License - 2024
