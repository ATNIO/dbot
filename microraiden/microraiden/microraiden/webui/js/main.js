function mainSwitch(id) {
  $(".main_switch" + id).show();
  $(".main_switch:not(" + id + ")").hide();
  $(".container").show();
}

function pageReady(json) {

  // ==== BASIC INITIALIZATION ====

  // you can set this variable in a new 'script' tag, for example
  if (!window.uRaidenParams && Cookies.get("RDN-Price")) {
    window.uRaidenParams = {
      contract: Cookies.get("RDN-Contract-Address"),
      token: Cookies.get("RDN-Token-Address"),
      receiver: Cookies.get("RDN-Receiver-Address"),
      amount: +(Cookies.get("RDN-Price")),
    };
  } else if (!window.uRaidenParams) {
    window.uRaidenParams = {
      contract: json["contractAddr"],
      token: json["tokenAddr"],
      receiver: json["receiver"],
      amount: json["amount"],
    };
  }

  window.uraiden = new MicroRaiden(
    window.web3,
    uRaidenParams.contract,
    json["contractABI"],
    uRaidenParams.token,
    json["tokenABI"],
  );

  // ==== MAIN VARIABLES ====

  let $select = $("#accounts");
  let autoSign = false;

  // ==== FUNCTIONS ====

  function errorDialog(text, err) {
    const msg = err && err.message ?
      err.message.split(/\r?\n/)[0] :
      typeof err === "string" ?
        err.split(/\r?\n/)[0] :
        JSON.stringify(err);
    return window.alert(`${text}:\n${msg}`);
  }

  function refreshAccounts(_autoSign) {

    autoSign = !!_autoSign;
    console.log('first step,refreshAccounts');
    $select.empty();
    uraiden.getAccounts((err, accounts) => {
      if (err || !accounts || !accounts.length) {
        mainSwitch("#no_accounts");
        // retry after 1s
        setTimeout(refreshAccounts, 1000);
      } else {
        mainSwitch("#channel_loading");
        $.each(accounts, (k, v) => {
          const o = $("<option></option>").attr("value", v).text(v);
          $select.append(o);
          if (k === 0) {
            $select.change();
          }
        });
      }
    });
  }

  function signRetry() {
    console.log('signRetry');
    autoSign = false;
    uraiden.incrementBalanceAndSign(uRaidenParams.amount, (err, sign) => {//消费token并签名
      if (err && err.message && err.message.includes('Insuficient funds')) {
        console.error(err);
        const current = +(err.message.match(/current ?= ?([\d.,]+)/i)[1]);
        const required = +(err.message.match(/required ?= ?([\d.,]+)/i)[1]) - current;
        $('#deposited').text(current);
        $('#required').text(required);
        $('#remaining').text(current - uraiden.channel.balance);
        return mainSwitch("#topup");
      } else if (err && err.message && err.message.includes('User denied message signature')) {
        console.error(err);
        $('.channel_present_sign').addClass('green-btn');
        return;
      } else if (err) {
        console.error(err);
        errorDialog("An error occurred trying to sign the transfer", err);
        return refreshAccounts();
      }
      $('.channel_present_sign').removeClass('green-btn');
      console.log("SIGNED!", sign);
      Cookies.set("RDN-Sender-Address", uraiden.channel.account);
      Cookies.set("RDN-Open-Block", uraiden.channel.block);
      Cookies.set("RDN-Sender-Balance", uraiden.channel.balance);
      Cookies.set("RDN-Balance-Signature", sign);
      Cookies.remove("RDN-Nonexisting-Channel");
      //location.reload();
    });
  }

  function closeChannel(closeSign) {
    console.log('closeChannel action');
    uraiden.closeChannel(closeSign, (err, res) => {
      if (err) {
        errorDialog("An error occurred trying to close the channel", err);
        return refreshAccounts();
      }
      console.log("CLOSED", res);
      refreshAccounts();
    });
  }

  // ==== BINDINGS ====

  $select.change(($event) => {
    console.log('second step,load account info');
    const account = $event.target.value;

    console.log('4 step,load store channel');
    uraiden.loadStoredChannel(account, uRaidenParams.receiver);//获取当前开通的channel,localStorage,需要优化

    uraiden.getTokenInfo(account, (err, token) => {
      console.log('5 step,getTokenInfo', token);
      if (err) {
        console.error('Error getting token info', err);
      } else {
        $('.tkn-name').text(token.name);
        $('.tkn-symbol').text(token.symbol);
        $('.tkn-balance').attr("value", `${token.balance || 0} ${token.symbol}`);
        $('.tkn-decimals')
          .attr("min", Math.pow(10, -token.decimals).toFixed(token.decimals));
      }
      console.log('get account balance ', $('.tkn-balance').attr("value"));
      if (uraiden.isChannelValid() &&
        uraiden.channel.account === $event.target.value &&
        uraiden.channel.receiver === uRaidenParams.receiver) {
        console.log('channel info', uraiden.channel);

        uraiden.getChannelInfo((err, info) => {
          if (err) {
            console.error(err);
            info = {state: "error", deposit: 0}
          } else if (Cookies.get("RDN-Nonexisting-Channel")) {
            Cookies.remove("RDN-Nonexisting-Channel");
            window.alert("Server won't accept this channel.\n" +
              "Please, close+settle+forget, and open a new channel");
            $('#channel_present .channel_present_sign').attr("disabled", true);
            autoSign = false;
          }
          console.log('6 step getChannelInfo', info);
          $(`#channel_present .on-state.on-state-${info.state}`).show();
          $(`#channel_present .on-state:not(.on-state-${info.state})`).hide();

          let remaining = 0;
          if (info.deposit > 0 && uraiden.channel && !isNaN(uraiden.channel.balance)) {
            remaining = info.deposit - uraiden.channel.balance;
          }
          console.log('now remaining token ', info.deposit, '-', uraiden.channel.balance);//消费的token存在localStorage里
          $("#channel_present #channel_present_balance").text(remaining);
          $("#channel_present #channel_present_deposit").attr("value", info.deposit);
          $(".btn-bar").show()
          if (info.state === 'opened' && autoSign) {
            //signRetry();
          }
          console.log("channel present");
          mainSwitch("#channel_present");
        });
      } else {
        console.log("channel missing");
        mainSwitch("#channel_missing");
      }
    });
  });

  $("#channel_missing_deposit").bind("input", ($event) => {
    if (+$event.target.value > 0) {
      $("#channel_missing_start").attr("disabled", false);
    } else {
      $("#channel_missing_start").attr("disabled", true);
    }
  });
  $("#channel_missing_start").attr("disabled", false);

  $("#channel_missing_start").click(() => {//open channel
    const deposit = +$("#channel_missing_deposit").val();
    const account = $("#accounts").val();
    mainSwitch("#channel_opening");
    uraiden.openChannel(account, uRaidenParams.receiver, deposit, (err, channel) => {
      if (err) {
        console.error(err);
        errorDialog("An error ocurred trying to open a channel", err);
        return refreshAccounts();
      }
      Cookies.remove("RDN-Nonexisting-Channel");
      return refreshAccounts(true);
    });
  });

  $(".channel_present_sign").click(signRetry);

  $(".channel_present_close").click(() => {
    if (!window.confirm("Are you sure you want to close this channel?")) {
      return;
    }
    console.log('click close channel');
    mainSwitch("#channel_opening");
    // signBalance without balance, sign current balance only if needed
    uraiden.signBalance(null, (err, sign) => {//关闭channel需要最后一次签名，使用当前已使用的token进行签名
      if (err) {
        errorDialog("An error occurred trying to get balance signature", err);
        return refreshAccounts();
      }
      Cookies.set("RDN-Sender-Address", uraiden.channel.account);
      Cookies.set("RDN-Open-Block", uraiden.channel.block);
      Cookies.set("RDN-Sender-Balance", uraiden.channel.balance);
      Cookies.set("RDN-Balance-Signature", sign);
      // call cooperative-close URL, and closeChannel with close_signature data
      $.ajax({
        url: `/api/1/channels/${uraiden.channel.account}/${uraiden.channel.block}`,
        method: 'DELETE',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({'balance': uraiden.channel.balance}),
        success: (result) => {
          let closeSign = null;
          if (result && typeof result === 'object' && result['close_signature']) {
            closeSign = result['close_signature'];
          } else {
            console.warn('Invalid cooperative-close response', result);
          }
          closeChannel(closeSign);
        },
        error: (request, msg, error) => {
          console.warn('Error calling cooperative-close', request, msg, error);
          alert('close channel error');
          closeChannel(null);
        }
      });
    });
  });

  $(".channel_present_settle").click(() => {
    if (!window.confirm("Are you sure you want to settle this channel?")) {
      return;
    }
    mainSwitch("#channel_opening");
    uraiden.settleChannel((err, res) => {
      if (err) {
        errorDialog("An error occurred trying to settle the channel", err);
        return refreshAccounts();
      }
      console.log("SETTLED", res);
      refreshAccounts();
    });
  });

  $(".channel_present_forget").click(() => {
    if (!window.confirm("Are you sure you want to forget this channel?" +
        ($('.on-state-settled').is(':visible') ? "" :
          "\nWarning: channel will be left in an unsettled state."))) {
      return;
    }
    Cookies.remove("RDN-Sender-Address");
    Cookies.remove("RDN-Open-Block");
    Cookies.remove("RDN-Sender-Balance");
    Cookies.remove("RDN-Balance-Signature");
    Cookies.remove("RDN-Nonexisting-Channel");
    uraiden.forgetStoredChannel();//just remove localStorage ,not settled status
    refreshAccounts();
  });

  $("#topup_deposit").bind("input", ($event) => {
    if (+$event.target.value > 0) {
      $("#topup_start").attr("disabled", false);
    } else {
      $("#topup_start").attr("disabled", true);
    }
  });

  //store more token ,some to open channel
  $("#topup_start").click(() => {
    const deposit = +$("#topup_deposit").val();
    mainSwitch("#channel_opening");
    uraiden.topUpChannel(deposit, (err, block) => {
      if (err) {
        refreshAccounts();
        console.error(err);
        return errorDialog("An error ocurred trying to deposit to channel", err);
      }
      return refreshAccounts(true);
    });
  });

  $(".token_buy").click(() => {
    const account = $select.val();
    mainSwitch("#channel_opening");
    return uraiden.buyToken(
      account,
      (err, res) => {
        if (err) {
          console.error(err);
          errorDialog("An error ocurred trying to buy tokens", err);
        }
        return refreshAccounts();
      }
    );
  });

  // ==== FINAL SETUP ====

  $("#amount").text(uRaidenParams["amount"]);
  $('[data-toggle="tooltip"]').tooltip();
  refreshAccounts(true);//loading account
}


mainSwitch("#channel_loading");

$.getJSON("/js/parameters.json", (json) => {
  let cnt = 20;
  // wait up to 20*200ms for web3 and call ready()
  const pollingId = setInterval(() => {
    if (Cookies.get("RDN-Insufficient-Confirmations")) {
      Cookies.remove("RDN-Insufficient-Confirmations");
      clearInterval(pollingId);
      $("body").html('<h1>Waiting confirmations...</h1>');
      setTimeout(() => location.reload(), 5000);
    } else if (cnt < 0 || window.web3) {
      clearInterval(pollingId);
      pageReady(json);
    } else {
      --cnt;
    }
  }, 200);
});
