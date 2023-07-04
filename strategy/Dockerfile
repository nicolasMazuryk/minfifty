FROM node:16.16.0
RUN apt update && apt install -y bash nano

#FROM node:16.16-alpine3.16
#RUN apk update && apk add bash nano curl

WORKDIR /app

COPY . .

RUN npm install

RUN echo "NODE_ENV=production" >> .env
RUN echo "BINANCE_API_KEY=${BINANCE_ACCOUNT1_API_KEY}" >> .env
RUN echo "BINANCE_API_SECRET=${BINANCE_ACCOUNT10_API_SECRET}" >> .env
RUN echo "BINANCE_SPOT_API_URL=https://api.binance.com" >> .env
RUN echo "BINANCE_SPOT_WS_URL=wss://stream.binance.com" >> .env
RUN echo "BINANCE_FUTURES_API_URL=https://fapi.binance.com" >> .env
RUN echo "BINANCE_FUTURES_WS_URL=wss://fstream.binance.com/ws" >> .env

RUN echo "SQL_HOST=" >> .env
RUN echo "SQL_PORT=" >> .env
RUN echo "SQL_DB=" >> .env
RUN echo "SQL_USER=" >> .env
RUN echo "SQL_PASS=" >> .env

CMD ["npm", "run", "real-time"]
