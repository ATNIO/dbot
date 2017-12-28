"use strict";
if (typeof Web3 === 'undefined' && typeof require === 'function') {
  var Web3 = require("web3");
}

if (typeof localStorage === 'undefined' && typeof require === 'function') {
  const LocalStorage = require('node-localstorage').LocalStorage;
  var localStorage = new LocalStorage('./local_storage');
}

if (typeof $ == 'undefined' && typeof require === 'function') {
  var $ = require('jQuery');
}


class MicroRaiden {

  constructor(web3url,
              contractAddr,
              contractABI,
              tokenAddr,
              tokenABI,) {
    if (!web3url) {
      web3url = "http://localhost:8545";
    }
    if (web3url.currentProvider) {
      this.web3 = new Web3(web3.currentProvider);
    }
    else if (typeof web3url === 'string') {
      this.web3 = new Web3(new Web3.providers.HttpProvider(web3url));
    }

    contractAddr = contractAddr || window["RDNcontractAddr"];
    contractABI = contractABI || window["RDNcontractABI"];
    this.contract = this.web3.eth.contract(contractABI).at(contractAddr);

    tokenAddr = tokenAddr || window["RDNtokenAddr"];
    tokenABI = tokenABI || window["RDNtokenABI"];
    this.token = this.web3.eth.contract(tokenABI).at(tokenAddr);

    this.decimals = 0;
  }

  // "static" methods/utils
  encodeHex(str, zPadLength) {
    /* Encode a string or number as hexadecimal, without '0x' prefix
     */
    if (typeof str === "number") {
      str = str.toString(16);
    } else {
      str = [...str].map((char) =>
        char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
    }
    return str.padStart(zPadLength, '0');
  }

  catchCallback(func, ...params) {
    /* This method calls a function, with a node-style callback as last parameter,
     * forwarding call exceptions to callback first parameter
     */
    const callback = params.pop();
    if (typeof callback !== 'function') {
      throw new Error('Invalid callback as last parameter');
    }
    try {
      return func(...params, callback);
    } catch (e) {
      return callback(e);
    }
  }

  num2bal(value) {
    return Math.floor(value * Math.pow(10, this.decimals));
  }

  bal2num(bal) {
    return bal && bal.div ?
      bal.div(Math.pow(10, this.decimals)) :
      bal / Math.pow(10, this.decimals);
  }

  // instance methods
  loadStoredChannel(account, receiver) {
    if (!localStorage) {
      this.channel = undefined;
      return;
    }
    const key = account + "|" + receiver;
    const value = localStorage.getItem(key);
    if (value) {
      this.channel = JSON.parse(value);
    } else {
      this.channel = undefined;
    }
  }

  forgetStoredChannel() {
    if (localStorage) {
      const key = this.channel.account + "|" + this.channel.receiver;
      localStorage.removeItem(key);
    }
    this.channel = undefined;
  }

  setChannel(channel) {
    this.channel = channel;
    if (localStorage) {
      const key = channel.account + "|" + channel.receiver;
      localStorage.setItem(key, JSON.stringify(this.channel));
    }
  }

  getAccounts(callback) {
    return this.web3.eth.getAccounts(callback);
  }

  isChannelValid() {
    if (!this.channel || !this.channel.receiver || !this.channel.block
      || isNaN(this.channel.balance) || !this.channel.account) {
      return false;
    }
    return true;
  }

  getTokenInfo(account, callback) {
    const nameDefer = $.Deferred();
    const symbolDefer = $.Deferred();
    const decimalsDefer = $.Deferred();
    const balanceDefer = $.Deferred();

    this.token.name.call((err, name) =>
      err ? nameDefer.reject(err) : nameDefer.resolve(name));
    this.token.symbol.call((err, symbol) =>
      err ? symbolDefer.reject(err) : symbolDefer.resolve(symbol));
    this.token.decimals.call((err, decimals) =>
      err ? decimalsDefer.reject(err) : decimalsDefer.resolve(decimals.toNumber()));
    this.token.balanceOf.call(account, (err, balance) =>
      err ? balanceDefer.reject(err) : balanceDefer.resolve(balance));

    return $.when(nameDefer, symbolDefer, decimalsDefer, balanceDefer)
      .then((name, symbol, decimals, balance) => {
          this.decimals = decimals;
          callback(null, {name, symbol, decimals, balance: this.bal2num(balance)});
        },
        (err) => callback(err));
  }

  getChannelInfo(callback) {
    if (!this.isChannelValid()) {
      return callback(new Error("No valid channelInfo"));
    }
    return this.contract.ChannelCloseRequested({//event channel close
      _sender: this.channel.account,
      _receiver: this.channel.receiver,
      _open_block_number: this.channel.block,
    }, {
      fromBlock: this.channel.block,
      toBlock: 'latest'
    }).get((err, closeEvents) => {
      let closed;
      if (err) {
        return callback(err);
      } else if (!closeEvents || closeEvents.length === 0) {
        closed = false;
      } else {
        closed = closeEvents[0].blockNumber;
      }
      console.log('getChannelInfo closeEvents', closeEvents, '***closed', closed);
      return this.contract.ChannelSettled({ //event channel settled
        _sender: this.channel.account,
        _receiver: this.channel.receiver,
        _open_block_number: this.channel.block,
      }, {
        fromBlock: closed || this.channel.block,
        toBlock: 'latest'
      }).get((err, settleEvents) => {
        let settled;
        if (err) {
          return callback(err);
        } else if (!settleEvents || settleEvents.length === 0) {
          settled = false;
        } else {
          settled = settleEvents[0].blockNumber;
        }
        console.log('getChannelInfo ChannelSettled', closeEvents, '***settled', settled);
        // for settled channel, getChannelInfo call will fail, so we return before
        if (settled) {
          return callback(null, {"state": "settled", "block": settled, "deposit": 0});
        }
        return this.contract.getChannelInfo.call(
          this.channel.account,
          this.channel.receiver,
          this.channel.block,
          {from: this.channel.account},
          (err, info) => {
            if (err) {
              return callback(err);
            } else if (!(info[1] > 0)) {
              return callback(new Error("Invalid channel deposit: " + JSON.stringify(info)));
            }
            console.log('getChannelInfo', info);
            return callback(null, {
              "state": closed ? "closed" : "opened",
              "block": closed || this.channel.block,
              "deposit": this.bal2num(info[1]),
            });
          });
      });
    });
  }

  openChannel(account, receiver, deposit, callback) {
    if (this.isChannelValid()) {
      console.warn("Already valid channel will be forgotten:", this.channel);
    }

    // in this method, deposit is already multiplied by decimals
    deposit = this.num2bal(deposit);
    // automatically support both ERC20 and ERC223 tokens
    let transfer;
    console.log('openChannel token transfer');
    if (typeof this.token.transfer["address,uint256,bytes"] === "function") {
      // ERC223
      transfer = (_deposit, _receiver, cb) =>
        // transfer tokens directly to the channel manager contract
        this.token.transfer["address,uint256,bytes"].sendTransaction(
          this.contract.address,
          _deposit,
          _receiver, // bytes _data (3rd param) is the receiver
          {from: account},
          cb
        );
    } else {
      // ERC20
      transfer = (_deposit, _receiver, cb) =>
        // send 'approve' transaction to token contract
        this.token.approve.sendTransaction(
          this.contract.address,
          _deposit,
          {from: account},
          (err, approveTxHash) => {
            if (err) {
              return cb(err);
            }
            // send 'createChannel' transaction to channel manager contract
            return this.contract.createChannelERC20.sendTransaction(
              _receiver,
              _deposit,
              {from: account},
              cb
            );
          }
        );
    }

    // first, check if there's enough balance
    return this.token.balanceOf.call( //token合约
      account,
      {from: account},
      (err, balance) => {
        if (err) {
          return callback(err);
        } else if (!(balance >= deposit)) {
          return callback(new Error(`Not enough tokens.
            Token balance = ${this.bal2num(balance)}, required = ${this.bal2num(deposit)}`));
        }
        console.log('Token balance', this.token.address, this.bal2num(balance));
        // call transfer to make the deposit, automatic support for ERC20/223 token
        return transfer(
          deposit,
          receiver,
          (err, transferTxHash) => {
            if (err) {
              return callback(err);
            }
            console.log('transferTxHash', transferTxHash);
            // wait for 'transfer' transaction to be mined
            return this.waitTx(transferTxHash, 1, (err, receipt) => {
              if (err) {
                return callback(err);
              }
              // call getChannelInfo to be sure channel was created
              return this.contract.getChannelInfo.call(
                account,
                receiver,
                receipt.blockNumber,
                {from: account},
                (err, info) => {
                  if (err) {
                    return callback(err);
                  } else if (!(info[1] > 0)) {
                    return callback(new Error("No deposit found!"));
                  }
                  this.setChannel({account, receiver, block: receipt.blockNumber, balance: 0});
                  // return channel
                  return callback(null, this.channel);
                });
            });
          });
      });
  }

  topUpChannel(deposit, callback) {
    if (!this.isChannelValid()) {
      return callback(new Error("No valid channelInfo"));
    }

    // in this method, deposit is already multiplied by decimals
    deposit = this.num2bal(deposit);
    const account = this.channel.account;
    // automatically support both ERC20 and ERC223 tokens
    let transfer;
    if (typeof this.token.transfer["address,uint256,bytes"] === "function") {
      // ERC223, just send token.transfer transaction
      transfer = (_deposit, _receiver, _blockNumber, cb) =>
        // transfer tokens directly to the channel manager contract
        this.token.transfer["address,uint256,bytes"].sendTransaction(
          this.contract.address,
          _deposit,
          // receiver goes as 3rd param, 20 bytes, plus blocknumber, 4bytes
          _receiver + this.encodeHex(_blockNumber, 8),
          {from: account},
          cb
        );
    } else {
      // ERC20, approve channel manager contract to handle our tokens, then topUp
      transfer = (_deposit, _receiver, _blockNumber, cb) =>
        // send 'approve' transaction to token contract
        this.token.approve.sendTransaction(
          this.contract.address,
          _deposit,
          {from: account},
          (err, approveTxHash) => {
            if (err) {
              return cb(err);
            }
            // send 'topUp' transaction to channel manager contract
            return this.contract.topUpERC20.sendTransaction(
              _receiver,
              _blockNumber,
              _deposit,
              {from: account},
              cb
            );
          }
        );
    }

    // first, check if there's enough balance
    return this.token.balanceOf.call(
      account,
      {from: account},
      (err, balance) => {
        if (err) {
          return callback(err);
        } else if (!(balance >= deposit)) {
          return callback(new Error(`Not enough tokens.
            Token balance = ${this.bal2num(balance)}, required = ${this.bal2num(deposit)}`));
        }
        console.log('Token balance', this.token.address, this.bal2num(balance));
        // send 'transfer' transaction
        return transfer(
          deposit,
          this.channel.receiver,
          this.channel.block,
          (err, transferTxHash) => {
            if (err) {
              return callback(err);
            }
            console.log('transferTxHash', transferTxHash);
            // wait for 'transfer' transaction to be mined
            return this.waitTx(transferTxHash, 1, (err, receipt) => {
              if (err) {
                return callback(err);
              }
              // return current deposit
              return this.getChannelInfo((err, info) => {
                if (err) {
                  return callback(err);
                }
                return callback(null, info.deposit);
              });
            });
          });
      });
  }

  closeChannel(receiverSig, callback) {
    if (!this.isChannelValid()) {
      return callback(new Error("No valid channelInfo"));
    }
    return this.getChannelInfo((err, info) => {
      if (err) {
        return callback(err);
      } else if (info.state !== "opened") {
        return callback(new Error("Tried closing already closed channel"));
      }
      console.log(`Closing channel. Cooperative = ${receiverSig}`);
      let func;
      if (!this.channel.sign) {
        func = (cb) => this.signBalance(this.channel.balance, cb);
      } else {
        func = (cb) => cb(null, this.channel.sign);
      }
      return func((err, sign) => {
        if (err) {
          return callback(err);
        }
        let params = [
          this.channel.receiver,
          this.channel.block,
          this.num2bal(this.channel.balance),
          sign
        ];
        let paramsTypes = "address,uint32,uint192,bytes";
        if (receiverSig) {
          params.push(receiverSig);
          paramsTypes += ",bytes";
        }
        return this.contract.close[paramsTypes].sendTransaction(
          ...params,
          {from: this.channel.account},
          (err, txHash) => {
            if (err) {
              return callback(err);
            }
            console.log('closeTxHash', txHash);
            return this.waitTx(txHash, 0, (err, receipt) => {
              if (err) {
                return callback(err);
              }
              return callback(null, receipt.blockNumber);
            });
          });
      });
    });
  }

  settleChannel(callback) {
    if (!this.isChannelValid()) {
      return callback(new Error("No valid channelInfo"));
    }
    return this.getChannelInfo((err, info) => {
      if (err) {
        return callback(err);
      } else if (info.state !== "closed") {
        return callback(new Error("Tried settling opened or settled channel"));
      }
      return this.contract.settle.sendTransaction(
        this.channel.receiver,
        this.channel.block,
        {from: this.channel.account},
        (err, txHash) => {
          if (err) {
            return callback(err);
          }
          console.log('settleTxHash', txHash);
          return this.waitTx(txHash, 0, (err, receipt) => {
            if (err) {
              return callback(err);
            }
            return callback(null, receipt.blockNumber);
          });
        }
      );
    });
  }

  signMessage(msg, callback) {//签名后返回签名信息
    if (!this.isChannelValid()) {
      return callback(new Error("No valid channelInfo"));
    }
    const hex = '0x' + this.encodeHex(msg);
    console.log(`Signing "${msg}" => ${hex}, account: ${this.channel.account}`);
    return this.catchCallback(this.web3.personal.sign,
      hex,
      this.channel.account,
      (err, sign) => {
        if (err && err.message &&
          (err.message.includes('Method not found') ||
          err.message.includes('is not a function'))) {
          return this.catchCallback(this.web3.eth.sign,
            this.channel.account,
            hex,
            callback);
        }
        return callback(err, sign);
      });
  }

  signBalance(newBalance, callback) {//消费签名
    if (!this.isChannelValid()) {
      return callback(new Error("No valid channelInfo"));
    }
    if (newBalance === null) {
      newBalance = this.channel.balance;
    }
    console.log("signBalance ********** ", newBalance, this.channel, this.channel.balance);
    if (newBalance === this.channel.balance && this.channel.sign) {
      return callback(null, this.channel.sign);
    }
    return this.contract.getBalanceMessage.call(
      this.channel.receiver,
      this.channel.block,
      this.num2bal(newBalance),
      {from: this.channel.account},
      (err, msg) => {
        if (err) {
          return callback(err);
        }
        // ask for signing of this message
        return this.signMessage(msg, (err, sign) => {
          if (err) {
            return callback(err);
          }
          // return signed message
          if (newBalance === this.channel.balance && !this.channel.sign) {
            this.setChannel(Object.assign({}, this.channel, {sign}));
          }
          return callback(null, sign);
        });
      });
  }

  incrementBalanceAndSign(amount, callback) {
    if (!this.isChannelValid()) {
      return callback(new Error("No valid channelInfo"));
    }
    const newBalance = this.channel.balance + +amount;
    console.log('newBalance', newBalance, 'this.channel.balance', this.channel.balance);
    // get current deposit
    return this.getChannelInfo((err, info) => {
      if (err) {
        return callback(err);
      } else if (info.state !== "opened") {
        return callback(new Error("Tried signing on closed channel"));
      } else if (newBalance > info.deposit) {
        return callback(new Error(`Insuficient funds: current = ${info.deposit} , required = ${newBalance}`));
      }
      // get hash for new balance proof
      return this.signBalance(newBalance, (err, sign) => {
        if (err) {
          return callback(err);
        }
        this.setChannel(Object.assign(
          {},
          this.channel,
          {balance: newBalance, sign}
        ));
        return callback(null, sign);
      });
    });
  }

  waitTx(txHash, confirmations, callback) {
    /*
     * Watch for a particular transaction hash and call the awaiting function when done;
     * Got it from: https://github.com/ethereum/web3.js/issues/393
     */
    let blockCounter = 30;
    confirmations = +confirmations || 0;
    // Wait for tx to be finished
    let filter = this.web3.eth.filter('latest');
    filter.watch((err, blockHash) => {
      if (blockCounter <= 0) {
        if (filter) {
          filter.stopWatching();
          filter = null;
        }
        console.warn('!! Tx expired !!', txHash);
        return callback(new Error("Tx expired: " + txHash));
      }
      // Get info about latest Ethereum block
      return this.web3.eth.getTransactionReceipt(txHash, (err, receipt) => {
        if (err) {
          if (filter) {
            filter.stopWatching();
            filter = null;
          }
          return callback(err);
        } else if (!receipt || !receipt.blockNumber) {
          return console.log('Waiting tx..', --blockCounter);
        } else if (confirmations > 0) {
          console.log('Waiting confirmations...', confirmations);
          return --confirmations;
        }
        // Tx is finished
        if (filter) {
          filter.stopWatching();
          filter = null;
        }
        return callback(null, receipt);
      });
    });
    return filter;
  }

  /**
   * Mock buy, just mint the amount
   */
  buyToken(account, callback) {//购买token
    return this.catchCallback(
      this.token.mint && this.token.mint.sendTransaction,
      {from: account, value: this.web3.toWei(0.1, "ether")},
      (err, txHash) => {
        if (err) {
          return callback(err);
        }
        console.log('mintTxHash', txHash);
        return this.waitTx(txHash, 1, callback);
      }
    );
  }

}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports.MicroRaiden = MicroRaiden;
} else if (typeof define === 'function' && define.amd) {
  define([], function () {
    return MicroRaiden;
  });
} else {
  window.MicroRaiden = MicroRaiden;
}
