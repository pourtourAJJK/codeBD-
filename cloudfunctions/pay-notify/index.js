const cloud = require('wx-server-sdk');
const crypto = require('crypto');
const wxpayConfig = require('../wxpayFunctions/config');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const PAY_CONFIG = {
  appid: process.env.PAY_APPID,
  mchid: process.env.PAY_MCH_ID,
  apiV3Key: process.env.PAY_API_KEY,
  apiV2Key: process.env.PAY_API_V2_KEY || process.env.PAY_API_KEY,
  publicKey: wxpayConfig.publicKey
};

function normalizeHeaders(headers = {}) {
  const normalized = {};
  Object.keys(headers).forEach((key) => {
    normalized[key.toLowerCase()] = headers[key];
  });
  return normalized;
}

function verifyV3Signature(headers, rawBody) {
  const timestamp = headers['wechatpay-timestamp'];
  const nonce = headers['wechatpay-nonce'];
  const signature = headers['wechatpay-signature'];

  if (!timestamp || !nonce || !signature) return false;

  const signStr = `${timestamp}\n${nonce}\n${rawBody}\n`;
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(signStr);
  verifier.end();

  try {
    return verifier.verify(PAY_CONFIG.publicKey, signature, 'base64');
  } catch (error) {
    console.error('V3 签名验证异常:', error);
    return false;
  }
}

function decryptV3Resource(resource, apiV3Key) {
  const { ciphertext, nonce, associated_data: associatedData } = resource || {};
  if (!ciphertext || !nonce) throw new Error('V3 回调资源字段不完整');

  const key = Buffer.from(apiV3Key, 'utf8');
  const data = Buffer.from(ciphertext, 'base64');
  const authTag = data.slice(data.length - 16);
  const text = data.slice(0, data.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  if (associatedData) decipher.setAAD(Buffer.from(associatedData, 'utf8'));
  decipher.setAuthTag(authTag);

  let decoded = decipher.update(text, undefined, 'utf8');
  decoded += decipher.final('utf8');
  return JSON.parse(decoded);
}

function verifyV2Signature(params, key) {
  const sortedKeys = Object.keys(params).sort();
  const signStr = sortedKeys
    .filter(k => k !== 'sign' && params[k] !== '')
    .map(k => `${k}=${params[k]}`)
    .join('&');

  const sign = crypto
    .createHash('MD5')
    .update(`${signStr}&key=${key}`)
    .digest('hex')
    .toUpperCase();

  return sign === params.sign;
}

exports.main = async (event) => {
  try {
    const { headers, body: rawBody } = event;
    const normalizedHeaders = normalizeHeaders(headers);
    let orderData = null;

    if (normalizedHeaders['wechatpay-signature']) {
      if (!verifyV3Signature(normalizedHeaders, rawBody)) {
        console.error('V3 签名失败');
        return { statusCode: 403, body: 'Forbidden' };
      }
      const body = JSON.parse(rawBody);
      orderData = decryptV3Resource(body.resource, PAY_CONFIG.apiV3Key);
    } else {
      const params = rawBody;
      if (!verifyV2Signature(params, PAY_CONFIG.apiV2Key)) {
        console.error('V2 签名失败');
        return { statusCode: 403, body: 'Forbidden' };
      }
      orderData = params;
    }

    const outTradeNo = orderData.out_trade_no;
    const openid = orderData.payer?.openid || orderData.openid;
    const transactionId = orderData.transaction_id || '';
    const successTime = orderData.success_time || '';

    if (!outTradeNo) {
      return { statusCode: 400, body: '缺少订单号' };
    }

    await db.collection('shop_order').where({ out_trade_no: outTradeNo }).update({
      data: {
        pay_status: 1,
        status: 'paid',
        openid: openid || '',
        transaction_id: transactionId,
        success_time: successTime || db.serverDate(),
        updatedAt: db.serverDate()
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: 'SUCCESS'
    };
  } catch (err) {
    console.error('支付回调失败:', err);
    return { statusCode: 500, body: 'FAIL' };
  }
};
