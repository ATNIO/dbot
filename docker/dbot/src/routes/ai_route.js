'use strict';

var aiRouter = require('express').Router();
var jsonParser = require('body-parser').json();

const {
  aiResolve
} = require('../resolves/index')

aiRouter.use((req, res, next) => {
  console.log('Time: ', Date.now());
  next();
});

aiRouter.use(jsonParser);

aiRouter.post('/api/1/callAI', async (req, res) => {
  let params = req.body;
  let result = await aiResolve.callAI(params);
  console.log(result)
  res.send(result)
})

module.exports = aiRouter;