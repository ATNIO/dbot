'use strict';
const charge = require('../charge');
const rp = require('request-promise')

class URaidenBilling {
  constructor(_url) {
    this._url = _url;
    this._charge = new charge;
  }

  async getPrice(ai_id, sender) { 
    return await this._charge.getPrice(ai_id, sender);
  }

  async bill(ai_id, sender, receiver, block, balance, price, sign) {
    let fee = await this.getPrice(ai_id, sender);
    console.log("fee:",fee); 
    if((+price) < (+fee)) throw 'price changed';  
    let newBalance = (+balance) + (+price);
    let res = await this.transfer(sender, block, newBalance, sign);
    if(res.balance == newBalance){
      await this._charge.resetToken(fee, ai_id, sender);
      return true;
    } else {
      return false;
    }
  }

  async transfer(sender, block, balance, balance_signature) {

    const opts = {
      uri: `${this._url}/api/1/channels/transfer/${sender}/${block}`,
      body: {
        balance,
        balance_signature
      },
      json: true,
    }
    let res = await rp.put(opts);
    console.log(res);
    return res;
  }
}

module.exports = URaidenBilling;