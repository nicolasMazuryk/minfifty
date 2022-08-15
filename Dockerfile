FROM node:16.14.2

WORKDIR /usr/app

COPY ./server/package.json ./
COPY /server .

RUN npm install

EXPOSE 9000

CMD ["npm", "start"]
