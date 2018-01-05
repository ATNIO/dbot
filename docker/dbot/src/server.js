const express = require('express')
const app = express()

const {
  uraidenRouter,
  billRouter,
  aiRouter
} = require('./routes/index')

app.use('/uraiden', uraidenRouter);

app.use('/bill', billRouter);

app.use('/ai', aiRouter);

app.listen(3000, () => console.log('Dbot listening on port 3000!'))