'use strict';

const URaidenBilling = require("../utils/raiden/uraiden/uraidenBilling")
const config = require('../../config/config.json')
const bill = new URaidenBilling(config.URAIDEN_URL);

async function getPrice(params) {
  let ai_id = Buffer.from(params.ai_id, 'utf8').toString("hex")
  return await bill.getPrice(ai_id, params.sender);
}

module.exports = {
  getPrice
}