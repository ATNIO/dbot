'use strict';
const rp = require('request-promise')
const uraidenServerUrl = 'http://localhost:5000';

async function getChannels(sender, block, status) {
  let uri = `${uraidenServerUrl}/api/1/channels/${sender}`;
  if (Number.isInteger(Number.parseInt(block))) {
    uri += `/${block}`;
  }
  const opts = {
    uri,
    qs: {
      status
    },
    json: true,
  }
  let res = await rp.get(opts);
  return res;
}

async function closeRequest(sender, block, balance) {
  const opts = {
    uri: `${uraidenServerUrl}/api/1/channels/${sender}/${block}`,
    body: {
      balance
    },
    json: true,
  }
  let res = await rp.delete(opts);  
  return res;
}

module.exports = {
  getChannels,
  closeRequest
}