FROM node:8

LABEL maintainer="jingwei.hu@atmatrix.org"

RUN mkdir -p /dbot
WORKDIR /dbot

COPY dbot /dbot

RUN npm i

EXPOSE 3000

CMD ["node", "src/server.js"]

