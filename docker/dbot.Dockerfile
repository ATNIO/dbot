FROM node:8

LABEL maintainer="jingwei.hu@atmatrix.org"

RUN mkdir -p /dbot
WORKDIR /dbot

COPY dbot /dbot

EXPOSE 3000

CMD ["node", "dist/server.js"]
