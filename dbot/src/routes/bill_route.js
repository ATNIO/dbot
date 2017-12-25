'use strict';

var billRouter = require('express').Router();
var jsonParser = require('body-parser').json();

const {
  billResolve
} = require('../resolves/index')

billRouter.use((req, res, next) => {
  console.log('Time: ', Date.now());
  next();
});

billRouter.use(jsonParser);

billRouter.get('/api/1/getPrice', async (req, res) => {
  let params = req.query;
  let result = await billResolve.getPrice(params);
  console.log(result);
  res.send(result)
})

module.exports = billRouter;