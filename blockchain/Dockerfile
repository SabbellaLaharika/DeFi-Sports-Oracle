FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Compile contracts on build
RUN npx hardhat compile

EXPOSE 8545

CMD ["npx", "hardhat", "node"]
