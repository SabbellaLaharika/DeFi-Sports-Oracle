#!/bin/sh

# Start the hardhat node in the background
npx hardhat node &

# Wait for the node to be ready
echo "Waiting for Hardhat node to start..."
until curl -s http://localhost:8545 > /dev/null; do
  sleep 1
done

echo "Hardhat node is up! Deploying contracts..."
# Run the deployment script
npx hardhat run scripts/deploy.js --network localhost

# Keep the process alive
wait
