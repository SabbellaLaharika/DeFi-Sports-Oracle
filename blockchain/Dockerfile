FROM node:20

WORKDIR /app

COPY package*.json ./
RUN apt-get update && apt-get install -y curl
RUN npm install

COPY . .

# Compile contracts on build
RUN npx hardhat compile

# Make the start script executable
RUN chmod +x start.sh

EXPOSE 8545

# Use the start script
CMD ["./start.sh"]
