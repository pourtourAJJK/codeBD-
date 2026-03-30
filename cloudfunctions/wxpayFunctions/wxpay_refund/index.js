/**
 * 微信支付 - 申请退款
 */
const cloud = require('wx-server-sdk');
const { withResponse } = require('../../utils/response');
const https = require('https');
const config = require('../config');
const certUtils = require('../certUtils');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 生成唯一随机字符串
const generateNonce = (length = 16) => {
  return Math.random().toString(36).substring(2, 2 + length);
};

// 微信支付退款API
const createWxpayRefund = async (params) => {
  const timestamp = new Date().toISOString();
  const orderId = params.orderId || '未提供';
  const outRefundNo = params.out_refund_no || `REFUND_${Date.now()}`;
  const maskedTransactionId = params.transaction_id ? params.transaction_id.substring(0, 10) + '...' : '未提供';
  
  console.log(`[${timestamp}] [wxpay_refund-微信退款API-开始] [订单ID:${orderId}] [退款单号:${outRefundNo}] 准备调用微信支付退款API`);
  console.log(`[${timestamp}] [wxpay_refund-微信退款API-参数] [订单ID:${orderId}] 支付单号:${maskedTransactionId}, 退款金额:${params.refundFee}, 订单总金额:${params.totalFee}`);

  try {
    // 参数校验
    if (!params.transaction_id) {
      throw new Error('缺少transaction_id参数');
    }
    if (!params.refundFee || params.refundFee <= 0) {
      throw new Error('退款金额必须大于0');
    }
    if (!params.totalFee || params.totalFee <= 0) {
      throw new Error('订单总金额必须大于0');
    }

    // 金额转换：如果是元，转为分；如果已经是分，直接使用
    const refundFee = Math.round(Number(params.refundFee) * (Number(params.refundFee) > 100 ? 1 : 100));
    const totalFee = Math.round(Number(params.totalFee) * (Number(params.totalFee) > 100 ? 1 : 100));

    const requestBody = {
      transaction_id: params.transaction_id,
      out_refund_no: outRefundNo,
      amount: {
        refund: refundFee,
        total: totalFee,
        currency: 'CNY'
      }
    };

    // 如果有退款原因，添加到请求体
    if (params.reason) {
      requestBody.reason = params.reason;
    }

    const bodyStr = JSON.stringify(requestBody);
    const method = 'POST';
    const url = '/v3/refund/domestic/refunds';
    const reqTimestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = generateNonce();

    const signature = certUtils.generateWechatPaySignature(
      method,
      url,
      reqTimestamp,
      nonce,
      bodyStr,
      config.privateKey
    );

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'WeChatPay/Refund v1.0',
      'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchid}",nonce_str="${nonce}",timestamp="${reqTimestamp}",serial_no="${config.serialNo}",signature="${signature}"`
    };

    console.log(`[${new Date().toISOString()}] [wxpay_refund-微信退款API-请求] [订单ID:${orderId}] 请求URL：https://api.mch.weixin.qq.com${url}`);
    console.log(`[${new Date().toISOString()}] [wxpay_refund-微信退款API-请求] [订单ID:${orderId}] 请求头：Authorization=${headers.Authorization.substring(0, 80)}...`);
    console.log(`[${new Date().toISOString()}] [wxpay_refund-微信退款API-请求] [订单ID:${orderId}] 请求体：`, {
      transaction_id: maskedTransactionId,
      out_refund_no: outRefundNo,
      amount: { refund: refundFee, total: totalFee }
    });

    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.mch.weixin.qq.com',
        path: url,
        method: 'POST',
        headers: headers
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(data);
            console.log(`[${new Date().toISOString()}] [wxpay_refund-微信退款API-响应] [订单ID:${orderId}] 响应状态：${res.statusCode}`);
            console.log(`[${new Date().toISOString()}] [wxpay_refund-微信退款API-响应] [订单ID:${orderId}] 响应数据：`, parsedData);
            resolve({ status: res.statusCode, data: parsedData });
          } catch (error) {
            console.error(`[${new Date().toISOString()}] [wxpay_refund-微信退款API-异常] [订单ID:${orderId}] 响应解析失败：`, error.message);
            reject(new Error(`响应解析失败：${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error(`[${new Date().toISOString()}] [wxpay_refund-微信退款API-异常] [订单ID:${orderId}] 请求失败：`, error.message);
        reject(error);
      });

      req.write(bodyStr);
      req.end();
    });

    if (response.status !== 200) {
      console.error(`[${new Date().toISOString()}] [wxpay_refund-微信退款API-错误] [订单ID:${orderId}] 微信支付API返回错误状态码：${response.status}`);
      if (response.data.code) {
        throw new Error(`微信支付API错误：${response.data.code} - ${response.data.message || '未知错误'}`);
      } else {
        throw new Error(`微信支付API返回错误状态码：${response.status}`);
      }
    }

    console.log(`[${new Date().toISOString()}] [wxpay_refund-微信退款API-成功] [订单ID:${orderId}] [退款单号:${outRefundNo}] 退款申请成功`);

    return {
      ...response.data,
      out_refund_no: outRefundNo
    };

  } catch (error) {
    console.error(`[${new Date().toISOString()}] [wxpay_refund-微信退款API-异常] [订单ID:${orderId}] [退款单号:${outRefundNo}] 退款申请失败`);
    console.error(`[${new Date().toISOString()}] [wxpay_refund-微信退款API-异常详情] [订单ID:${orderId}] 错误信息：`, error.message);
    console.error(`[${new Date().toISOString()}] [wxpay_refund-微信退款API-异常详情] [订单ID:${orderId}] 错误堆栈：`, error.stack);
    throw error;
  }
};

// 云函数入口函数
const handler = async (event, context) => {
  const timestamp = new Date().toISOString();
  const orderId = event.orderId || '未提供';
  const outRefundNo = event.out_refund_no || '未提供';
  
  console.log(`[${timestamp}] [wxpay_refund-开始] [订单ID:${orderId}] [退款单号:${outRefundNo}] 接收退款请求`);
  console.log(`[${timestamp}] [wxpay_refund-参数] [订单ID:${orderId}] 完整参数：`, event);

  try {
    const result = await createWxpayRefund(event);
    console.log(`[${new Date().toISOString()}] [wxpay_refund-成功] [订单ID:${orderId}] [退款单号:${outRefundNo}] 退款处理完成`);
    return result;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [wxpay_refund-异常] [订单ID:${orderId}] [退款单号:${outRefundNo}] 退款处理失败`);
    console.error(`[${new Date().toISOString()}] [wxpay_refund-异常详情] [订单ID:${orderId}] 错误信息：`, error.message);
    console.error(`[${new Date().toISOString()}] [wxpay_refund-异常详情] [订单ID:${orderId}] 错误堆栈：`, error.stack);
    throw error;
  } finally {
    console.log(`[${new Date().toISOString()}] [wxpay_refund-结束] [订单ID:${orderId}] [退款单号:${outRefundNo}] 退款请求处理结束`);
  }
};

exports.main = withResponse(handler);
