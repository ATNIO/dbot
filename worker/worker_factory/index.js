const blockchain = require("../util")
console.log(blockchain)

module.exports = class monitor {

  constructor(aiName, config) {
    console.log(config);
    this.aiName = aiName;
    this.config = config;
  }

  async run() {
    const Web3 = require('web3');
    const fs = require('fs');
    const contract = require("truffle-contract");
    const business_artifacts = require('../../billing/build/contracts/AIBusinessController.json');
    const att_artifacts = require('../../billing/build/contracts/ATT.json');

    let endpoint = blockchain.endpoint;

    const web3 = new Web3(new Web3.providers.HttpProvider(endpoint));
    web3.personal.unlockAccount(blockchain.account.address, blockchain.account.password);
    let provider = new Web3.providers.HttpProvider(endpoint);

    console.log("aiName: ", this.aiName)
    let aiNameTemp = this.aiName
    const Api = require('../' + aiNameTemp);

    let BusinessContract = contract(business_artifacts);
    let ATT = contract(att_artifacts);
    BusinessContract.setProvider(provider);
    ATT.setProvider(provider);

    let deployedAddress = blockchain.contracts;
    let businessToken = await BusinessContract.at(deployedAddress.biz);
    let att = await ATT.at(deployedAddress.att);

    let eventFundsFrozen = businessToken.EventFundsFrozen();
    let eventFundsDeduct = businessToken.EventFundsDeduct();

    let hex = '0x' + Buffer.from(aiNameTemp, 'utf8').toString("hex");
    for (let i = hex.length; i < 66; i++) {
      hex += '0';
    }
    aiNameTemp = hex;
    console.log("aiName: ", aiNameTemp);
    const owner = blockchain.account.address;
    const gas = blockchain.gas;

    const beneficiary = blockchain.beneficiary;
    console.log("beneficiary", beneficiary);
    await att.balanceOf(owner, {
      from: owner,
      gas: gas
    }).then(function (r) {
      console.log("owner balance: ", r.toString());
    });
    await att.balanceOf(beneficiary, {
      from: owner,
      gas: gas
    }).then(function (r) {
      console.log("beneficiary balance:", r.toString());
    });

    let config = this.config
    eventFundsFrozen.watch(function (err, res) {
      if (!err) {
        console.log("res: ", res);
        let args = JSON.parse(res.args.arg);
        console.log(args)
        const api = new Api(config);
        console.log("api: ", api);
        const aiId = res.args._id;
        console.log("aiId: ", aiId);
        if (aiId === aiNameTemp) {
          let callId = parseInt(res.args._callID);
          console.log("callId: ", callId);

          console.log("eventFundsFrozen has been detected ");

          try {
            //调用AI得到数据成功
            api.query(args).then((res) => {
              console.log("res: ", res);
              //调用AI结束
              if (res != null) {
                const dataResult = JSON.stringify(res);
                console.log("dataResult: ", dataResult);

                businessToken.callFundsDeduct(aiNameTemp, callId, true, dataResult.toString(), {
                  from: owner,
                  gas: gas
                }).then(async function (r) {
                  await att.balanceOf(owner, {
                    from: owner,
                    gas: gas
                  }).then(function (r) {
                    console.log("owner balance: ", r.toString());
                  });
                  await att.balanceOf(beneficiary, {
                    from: owner,
                    gas: gas
                  }).then(function (r) {
                    console.log("beneficiary balance:", r.toString());
                  });
                });
              } else {
                businessToken.callFundsDeduct(aiNameTemp, callId, false, dataResult.toString(), {
                  from: owner,
                  gas: gas
                });
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
