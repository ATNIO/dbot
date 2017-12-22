const TOKEN_VALID = "valid";
const TOKEN_INVALID = "invalid";

const IntervalType = {
  "day": "0",
  "month": "1",
  "quarter": "2",
  "year": "3"
}

class Token {
  constructor() {
    this.expire = TOKEN_INVALID;
  }

}

class TokenFree extends Token {
  constructor() {
    super();
    this.expire = TOKEN_VALID;
  }
}

class TokenInterval extends Token {
  constructor(intervalType) {
    super();
    switch (intervalType) {
      case IntervalType["day"]:
        this.daysAfter = 1;
        break;
      case IntervalType["month"]:
        this.daysAfter = 30;
        break;
      case IntervalType["quarter"]:
        this.daysAfter = 30 * 3;
        break;
      case IntervalType["year"]:
        this.daysAfter = 365;
        break;
      default:
        throw 'unknowed IntervalType';
        break;
    }
  }
}

class TokenTimes extends Token {
  constructor(freeTimes) {
    super();
    this.freeTimes = freeTimes;
    this.callTimes = 0;
  }

}

class TokenOther extends Token {
  constructor() {
    super();
  }
}

module.exports = {
  Token: Token,
  TokenFree: TokenFree,
  TokenInterval: TokenInterval,
  TokenTimes: TokenTimes,
  TokenOther: TokenOther
}