const {
  TokenFree,
  TokenTimes,
  TokenInterval,
  TokenOther
} = require('./raiden/token')

const config = require('../../config/config.json')

const redis = require("redis");
const redisConfig = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT
}

const client = redis.createClient(redisConfig)

client.on("error", function (err) {
  console.log("Error " + err);
});

client.on("connect", async () => {
  let xiaoi = Buffer.from(config.AI_NAME, 'utf8').toString("hex")
  let o = {
    "AI_NAME": config.AI_NAME, 
    "AI_BILLING_TYPE": config.AI_BILLING_TYPE,
    "AI_ARG0": config.AI_ARG0,
    "AI_ARG1": config.AI_ARG1
  }
  client.hmset(xiaoi, o);
  client.hgetall(xiaoi, redis.print)
});


module.exports = client;
