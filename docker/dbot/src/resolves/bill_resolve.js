'use strict';

const URaidenBilling = require("../utils/raiden/uraiden/uraidenBilling")
const uraidenServerUrl = 'http://localhost:5000';
const bill = new URaidenBilling(uraidenServerUrl);

async function getPrice(params) {
  let ai_id = Buffer.from(params.ai_id, 'utf8').toString("hex")
  return await bill.getPrice(ai_id, params.sender);
}

module.exports = {
  getPrice
}