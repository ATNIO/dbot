const {
  TokenFree,
  TokenTimes,
  TokenInterval,
  TokenOther
} = require('./raiden/token')

const redis = require("redis");
const redisConfig = {
  host:'106.14.207.120',
  port:'6379'
}

const client = redis.createClient(redisConfig)

client.on("error", function (err) {
  console.log("Error " + err);
});

client.on("connect", async () => {
  let xiaoi = Buffer.from('xiaoi', 'utf8').toString("hex")
  let o = {
    "AI_NAME": "xiaoi", // NOTE: key and value will be coerced to strings
    "AI_BILLING_TYPE": "1",
    "AI_ARG0": "1",
    "AI_ARG1": "1"
  }
  client.hmset(xiaoi, o);
  client.hgetall(xiaoi, redis.print)
  // const consumer_address = '0x00eb5ca24922a29e25e748025c28e8a654339aea';
  // let token = new TokenFree();
  // client.set(consumer_address, JSON.stringify(token));
  // client.get(consumer_address, (e, o) => {
  //   console.log(o)
  // });

  
  // this key will expire after 10 seconds
  // client.set('key', JSON.stringify(o), 'EX', 10);
  // client.get('key', function(e,o){
  //   console.log(o)
  // })
});


module.exports = client;
