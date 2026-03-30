// 退款通知回调核心函数：接收微信退款回调、验签、更新退款表和订单状态
const cloud = require('wx-server-sdk');
const { withResponse } = require('../utils/response');

const { Wechatpay } = require('wechatpay-node-v3');
const CryptoJS = require('crypto-js');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 复用微信支付配置（同支付回调）
const payConfig = {
  appid: process.env.PAY_APPID,
  mchid: process.env.PAY_MCH_ID,
  privateKey: process.env.PAY_PRIVATE_KEY,
  serialNo: process.env.PAY_SERIAL_NO,
  apiV3Key: process.env.PAY_API_KEY
};
const pay = new Wechatpay(payConfig);

// 云函数入口
const handler = async (event, context) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [refund-notify-开始] 接收微信退款回调`);
  console.log(`[${timestamp}] [refund-notify-原始事件]`, event);

  try {
    // 1. 解析退款回调原始数据
    console.log(`[${timestamp}] [refund-notify-解析回调数据] 开始解析回调原始数据`);
    const { headers = {}, body } = event;
    const rawBody = body;
    const wechatpayTimestamp = headers['wechatpay-timestamp'] || headers['WeChatPay-Timestamp'] || headers['wechatpay-Timestamp'];
    const nonce = headers['wechatpay-nonce'] || headers['WeChatPay-Nonce'] || headers['wechatpay-Nonce'];
    const signature = headers['wechatpay-signature'] || headers['WeChatPay-Signature'] || headers['wechatpay-Signature'];
    const serial = headers['wechatpay-serial'] || headers['WeChatPay-Serial'] || headers['wechatpay-Serial'];

    console.log(`[${timestamp}] [refund-notify-回调头信息] 时间戳:${wechatpayTimestamp}, 随机串:${nonce}, 证书序列号:${serial}`);

    // 2. 验签
    console.log(`[${timestamp}] [refund-notify-验签] 开始验签`);
    const verifyResult = pay.verifySign({
      timestamp: wechatpayTimestamp,
      nonce,
      signature,
      body: rawBody,
      serial
    });
    if (!verifyResult) {
      console.error(`[${timestamp}] [refund-notify-验签失败] 验签未通过`);
      return {
        code: 500,
        data: {},
        message: '验签失败'
      };
    }
    console.log(`[${timestamp}] [refund-notify-验签成功] 验签通过`);

    // 3. 解析退款回调数据
    console.log(`[${timestamp}] [refund-notify-解析数据] 开始解析退款回调数据`);
    const notifyData = JSON.parse(rawBody);
    const outRefundNo = notifyData.out_refund_no; // 商户退款单号
    const refundStatus = notifyData.refund_status; // 退款状态（SUCCESS/FAIL/CLOSED等）
    const refundAmount = notifyData.amount?.refund || 0; // 退款金额
    const outTradeNo = notifyData.out_trade_no; // 关联的商户订单号
    const successTime = notifyData.success_time; // 退款成功时间
    const maskedTransactionId = notifyData.transaction_id ? notifyData.transaction_id.substring(0, 10) + '...' : '未提供';

    console.log(`[${timestamp}] [refund-notify-回调数据] [订单ID:${outTradeNo}] [退款单号:${outRefundNo}] 退款状态:${refundStatus}, 退款金额:${refundAmount}, 支付单号:${maskedTransactionId}`);

    // 4. 更新退款记录表状态
    console.log(`[${timestamp}] [refund-notify-更新退款表] [订单ID:${outTradeNo}] [退款单号:${outRefundNo}] 开始更新shop_refund表`);
    const updateRefundResult = await db.collection('shop_refund')
      .where({ out_refund_no: outRefundNo })
      .update({
        data: {
          refund_status: refundStatus === 'SUCCESS' ? 'refunded' : 'refund_fail',
          refund_time: successTime ? new Date(successTime) : db.serverDate(),
          update_time: db.serverDate()
        }
      });
    console.log(`[${timestamp}] [refund-notify-更新退款表] [订单ID:${outTradeNo}] [退款单号:${outRefundNo}] shop_refund表更新成功, 更新记录数:${updateRefundResult.stats?.updated || 0}`);

    // 5. 更新订单状态
    if (refundStatus === 'SUCCESS') {
      console.log(`[${timestamp}] [refund-notify-更新订单状态] [订单ID:${outTradeNo}] 退款成功，开始更新shop_order表`);
      const updateOrderResult = await db.collection('shop_order')
        .where({ order_id: outTradeNo })
        .update({
          data: {
            statusmax: '9',
            statusText: '退款成功',
            statusColor: '#27ae60',
            updateTime: db.serverDate()
          }
        });
      console.log(`[${timestamp}] [refund-notify-更新订单状态] [订单ID:${outTradeNo}] shop_order表更新成功, 更新记录数:${updateOrderResult.stats?.updated || 0}`);
    } else {
      console.log(`[${timestamp}] [refund-notify-更新订单状态] [订单ID:${outTradeNo}] 退款状态非SUCCESS，跳过订单状态更新`);
    }

    // 6. 返回成功应答
    console.log(`[${timestamp}] [refund-notify-成功] [订单ID:${outTradeNo}] [退款单号:${outRefundNo}] 退款回调处理完成`);
    return {
      code: 200,
      data: {},
      message: '处理成功'
    };

  } catch (error) {
    console.error(`[${new Date().toISOString()}] [refund-notify-异常] 退款回调处理失败`);
    console.error(`[${new Date().toISOString()}] [refund-notify-异常详情] 错误信息:`, error.message);
    console.error(`[${new Date().toISOString()}] [refund-notify-异常详情] 错误堆栈:`, error.stack);
    return {
      code: 500,
      data: {},
      message: '服务器异常'
    };
  } finally {
    console.log(`[${new Date().toISOString()}] [refund-notify-结束] 退款回调处理流程结束`);
  }
};

exports.main = withResponse(handler);
