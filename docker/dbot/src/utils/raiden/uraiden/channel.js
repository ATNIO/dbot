const State = {
  'open': 1,
  'settling': 2,
  'closed': 3
}

class Channel {
  constructor(sender, receiver, deposit, block, balance, state = State['open']){
    this.sender = sender.toLowerCase()
    this.receiver = receiver.toLowerCase()
    this.deposit = deposit
    this.block = block
    this.balance = balance
    this.state = state
  }
}

module.exports = Channel;