const redis = require('../redis')
const {
  TokenFree,
  TokenTimes,
  TokenInterval,
  TokenOther
} = require('./token')

const BILLING_TYPE = {
  "Free": "0",
  "Times": "1",
  "Interval": "2",
  "Other": "3"
}

const TOKEN_VALID = "valid";
const TOKEN_INVALID = "invalid";

const client = require('../redis');

class charge {
  constructor() {}

  async getPrice(aiID, addr) {
    let fee = 0;
    let tokenID = addr + aiID;
    let token = await this.getToken(tokenID);
    if (token == TOKEN_VALID) {
      return fee;
    } else {
      try {
        const aiInfo = await this.getAiInfo(aiID);
        fee = aiInfo.AI_ARG0;
      } catch (error) {
        console.log(error);
      }
      return fee;
    }
  }

  async resetToken(fee, aiID, addr) {
    const aiInfo = await this.getAiInfo(aiID);
    let tokenID = addr + aiID;
    let token = await this.getToken(tokenID);
    token = JSON.parse(token);
    console.log("before:", token);
    const key = aiInfo.AI_BILLING_TYPE;
    const arg1 = aiInfo.AI_ARG1;
    switch (key) {
      case BILLING_TYPE["Free"]:
        {
          let tokenFree = new TokenFree();
          Object.assign(tokenFree, token);
          console.log("after", tokenFree);
          client.set(addr, JSON.stringify(tokenFree));
        }
        break;
      case BILLING_TYPE["Times"]:
        {
          let tokenTimes = new TokenTimes(arg1);
          Object.assign(tokenTimes, token);
          if (++tokenTimes.callTimes >= tokenTimes.freeTimes) {
            tokenTimes.expire = TOKEN_INVALID;
          }
          console.log("after", tokenTimes);
          client.set(addr, JSON.stringify(tokenTimes));
        }
        break;
      case BILLING_TYPE["Interval"]:
        {
          if (fee > 0) {
            let tokenInterval = new TokenInterval(arg1);
            Object.assign(tokenInterval, token);
            tokenInterval.expire = TOKEN_VALID;
            console.log("after", tokenInterval);
            // client.set(addr, JSON.stringify(tokenInterval), 'EX', Number.parseInt(tokenInterval.daysAfter)); //test
            client.set(addr, JSON.stringify(tokenInterval), 'EX', Number.parseInt(TokenInterval.daysAfter*24*60*60));
          }
        }
        break;
      case BILLING_TYPE["Other"]:
        {
          let tokenOther = new TokenOther();
          Object.assign(tokenOther, token);
          console.log("after", tokenOther);
        }
        break;
      default:
        throw 'unknowed BILLING_TYPE';
        break;
    }
  }

  getToken(address) {
    return new Promise((resolve, reject) => {
      redis.get(address, (e, o) => {
        if (e) reject(e);
        resolve(o);
      })
    })
  }

  getAiInfo(aiID) {
    return new Promise((resolve, reject) => {
      redis.hgetall(aiID, (e, o) => {
        if (e) reject(e);
        resolve(o);
      })
    })
  }

}

module.exports = charge;