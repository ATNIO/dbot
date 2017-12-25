FROM python:3

MAINTAINER echo <jingwei.hu@atmatrix.org>

RUN mkdir -p /usr/src/dbot
WORKDIR /usr/src/dbot


FROM node:8

RUN npm install
RUN npm install -g forever


EXPOSE 3000

CMD ["forever", "server.js"]
