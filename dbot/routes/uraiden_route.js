'use strict';

var uraidenRouter = require('express').Router();
var jsonParser = require('body-parser').json();

const {
  uraidenResolve
} = require('../resolves/index')

uraidenRouter.use((req, res, next) => {
  console.log('Time: ', Date.now());
  next();
});

uraidenRouter.use(jsonParser);

uraidenRouter.get('/api/1/channels/:sender', async (req, res) => {
  let sender = req.params.sender;
  let block = req.query.block;
  let status = req.query.status;
  let result = await uraidenResolve.getChannels(sender, block, status);
  console.log(result)
  res.send(result)
})

uraidenRouter.delete('/api/1/channels/:sender/:block', async (req, res) => {
  let sender = req.params.sender;
  let block = req.params.block;
  let balance = req.body.balance;
  let result = await uraidenResolve.closeRequest(sender, block, balance);
  console.log(result)
  res.send(result)
})

module.exports = uraidenRouter;