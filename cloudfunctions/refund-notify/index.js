// 退款通知回调核心函数：接收微信退款回调、验签、调用自定义云函�?
const cloud = require('wx-server-sdk');
const { withResponse } = require('../utils/response');

const { Wechatpay } = require('wechatpay-node-v3');
const CryptoJS = require('crypto-js');

cloud.init({ env: 'fuxididai8888-5g9tptvfb7056681' });

// 复用微信支付配置（同支付回调�?
const payConfig = {
  appid: process.env.PAY_APPID,
  mchid: process.env.PAY_MCH_ID,
  privateKey: process.env.PAY_PRIVATE_KEY,
  serialNo: process.env.PAY_SERIAL_NO,
  apiV3Key: process.env.PAY_API_KEY
};
const pay = new Wechatpay(payConfig);

// 云函数入�?
const handler = async (event, context) => {
  try {
    // 1. 解析退款回调原始数�?
    const { headers = {}, body } = event;
    const rawBody = body;
    const timestamp = headers['wechatpay-timestamp'] || headers['WeChatPay-Timestamp'] || headers['wechatpay-Timestamp'];
    const nonce = headers['wechatpay-nonce'] || headers['WeChatPay-Nonce'] || headers['wechatpay-Nonce'];
    const signature = headers['wechatpay-signature'] || headers['WeChatPay-Signature'] || headers['wechatpay-Signature'];
    const serial = headers['wechatpay-serial'] || headers['WeChatPay-Serial'] || headers['wechatpay-Serial'];

    // 2. 验签
    const verifyResult = pay.verifySign({
      timestamp,
      nonce,
      signature,
      body: rawBody,
      serial
    });
    if (!verifyResult) {
      return {
        code: 500,
        data: {},
        message: '验签失败'
      };
    }

    // 3. 解析退款回调数�?
    const notifyData = JSON.parse(rawBody);
    const outRefundNo = notifyData.out_refund_no; // 商户退款单�?
    const refundStatus = notifyData.refund_status; // 退款状态（SUCCESS/FAIL/CLOSED等）
    const refundAmount = notifyData.amount.refund; // 退款金�?
    const outTradeNo = notifyData.out_trade_no; // 关联的商户订单号

    // 4. 调用自定义云函数（scf:<函数�?格式�?
    let customFuncName = '';
    if (event.customFunc && event.customFunc.startsWith('scf:')) {
      customFuncName = event.customFunc.replace('scf:', '');
    }
    if (customFuncName) {
      await cloud.callFunction({
        name: customFuncName,
        data: {
          type: 'refund_notify',
          outRefundNo,
          refundStatus,
          refundAmount,
          outTradeNo,
          rawNotifyData: notifyData
        }
      });
    }

    // 5. 返回成功应答
    return {
      code: 200,
      data: {},
      message: '处理成功'
    };

  } catch (error) {
    console.error('退款回调处理失败：', error);
    return {
      code: 500,
      data: {},
      message: '服务器异常'
    };
  }
};

exports.main = withResponse(handler);
