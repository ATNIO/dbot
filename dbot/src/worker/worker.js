const Web3 = require('web3');
const config = require('../../config/config.json')
const biz_artifacts = require('../../config/contracts/AIBusinessController.json');
const Api = require('./API');
const sendTx = require("./sendTx")

module.exports = class monitor {

  constructor() {
    this.aiName = config.AI_NAME;
    this.config = config;
    this.api = new Api(this.config);
    this.private_key = config.PRIVATE_KEY;
    this.web3 = new Web3(config.PROVIDER);
    this.ownerAccount = this.web3.eth.accounts.privateKeyToAccount("0x" + this.private_key);
    this.owner = this.ownerAccount.address.toLowerCase();
    this.web3.eth.accounts.wallet.add(this.ownerAccount);
    this.biz = new this.web3.eth.Contract(biz_artifacts.abi, config.BIZ);
    this.biz.options.from = this.owner;
    this.biz.options.gas = config.gas;
    this.biz.options.gasPrice = config.gasPrice;
  }

  async run() {
    let aiNameTemp = this.aiName
    let hex = '0x' + Buffer.from(aiNameTemp, 'utf8').toString("hex");
    for (let i = hex.length; i < 66; i++) {
      hex += '0';
    }
    aiNameTemp = hex;
    this.biz.events.EventFundsFrozen({}, (err, res) => {
      console.log('===========frozenFunds============')
      console.log(res)
      if (!err) {
        let args = JSON.parse(res.returnValues.arg);
        const aiId = res.returnValues._id;
        if (aiId === aiNameTemp) {
          let callId = parseInt(res.returnValues._callID);
          try {
            this.api.query(args).then(async(res) => {
              console.log("res: ", res);
              if (res != null) {
                const dataResult = JSON.stringify(res);
                console.log("dataResult: ", dataResult);
                let receipt = await sendTx(this.web3, this.biz, 'callFundsDeduct', [aiNameTemp, callId, true, dataResult.toString()], (err, hash) => {
                  if (err) console.error(err);
                  console.log(`hash:${hash}`);
                })
              } else {
                let receipt = await sendTx(this.web3, this.biz, 'callFundsDeduct', [aiNameTemp, callId, false, dataResult.toString()], (err, hash) => {
                  if (err) console.error(err);
                  console.log(`hash:${hash}`);
                })
              }
            })
          } catch (e) {
            console.log(e);
          }
        }
      }
    })
  }
}