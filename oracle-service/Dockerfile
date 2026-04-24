FROM node:20

WORKDIR /app

COPY package*.json ./
RUN apt-get update && apt-get install -y curl
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
