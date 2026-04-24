FROM node:20

WORKDIR /app

COPY package*.json ./
RUN apt-get update && apt-get install -y curl
RUN npm install

COPY . .

# Compile contracts on build
RUN npx hardhat compile

EXPOSE 8545

CMD ["npx", "hardhat", "node"]
