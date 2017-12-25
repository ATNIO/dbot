'use strict';

const URaidenBilling = require("../utils/raiden/uraiden/uraidenBilling")
const uraidenServerUrl = 'http://127.0.0.1:5000';
const bill = new URaidenBilling(uraidenServerUrl);
const API = require('../worker/API/index');
const config = require('../../config/config.json')

async function callAI(params) {
  let ai_id = Buffer.from(params.ai_id, 'utf8').toString("hex")    
  let res = await bill.bill(ai_id, params.sender, params.receiver, params.block, params.balance, params.price, params.sign)
  if(res === true){   
    let api = new API(config)
    return await api.query({type:params.ai_id, question : params.input});
  }
  return res;
}

module.exports = {
  callAI
}