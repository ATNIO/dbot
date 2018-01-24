FROM node:8

LABEL maintainer="jingwei.hu@atmatrix.org"

RUN mkdir -p /dbot
WORKDIR /dbot

COPY dbot /dbot

RUN npm i

RUN npm i --save web3@1.0.0-beta.28

EXPOSE 3000

CMD ["node", "src/server.js"]

