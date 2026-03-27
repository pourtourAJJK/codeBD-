const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 平台证书只读环境变量：PAY_PUBLIC_KEY（多行或使用\n转义）
const PLATFORM_CERT = (process.env.PAY_PUBLIC_KEY || '').replace(/\\n/g, '\n');

const PAY_CONFIG = {
  appid: process.env.PAY_APPID,
  mchid: process.env.PAY_MCH_ID,
  apiV3Key: process.env.PAY_API_KEY,
  apiV2Key: process.env.PAY_API_V2_KEY || process.env.PAY_API_KEY,
  publicKey: PLATFORM_CERT
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
      console.error('缺少订单号');
      return { statusCode: 400, body: '缺少订单号' };
    }

    console.log('支付回调数据:', {
      outTradeNo,
      openid,
      transactionId,
      successTime
    });

    // 双字段匹配逻辑：优先通过order_id匹配，其次通过out_trade_no匹配
    let updateResult;
    let matchMethod = 'none';

    try {
      // 尝试通过order_id匹配（订单号格式：FX开头）
      if (outTradeNo.startsWith('FX')) {
        console.log('尝试通过order_id匹配:', outTradeNo);
        updateResult = await db.collection('shop_order').where({ order_id: outTradeNo }).update({
          data: {
            pay_status: "1",
            statusmax: "2",
            openid: openid || '',
            transaction_id: transactionId,
            success_time: successTime || db.serverDate(),
            paymentTime: successTime ? new Date(successTime).getTime() : db.serverDate(),
            paymentAmount: Number(orderData.amount?.total || orderData.total_fee || 0) / 100,
            updatedAt: db.serverDate()
          }
        });

        console.log('order_id匹配更新结果:', updateResult);
        if (updateResult.stats && updateResult.stats.updated > 0) {
          matchMethod = 'order_id';
          
          // ============== 新增：调用推送云函数 ==============
          try {
            // 调用order-push，把订单数据传过去
            await cloud.callFunction({
              name: "order-push",
              data: {
                doc: {
                  statusmax: "2",
                  _id: outTradeNo,
                  openid: openid
                }
              }
            });
            console.log("✅ 支付成功，推送触发成功");
          } catch (e) {
            console.error("❌ 推送失败", e);
          }
          // ==================================================
        }
      }

      // 如果order_id匹配失败，尝试通过out_trade_no匹配
      if (!matchMethod) {
        console.log('尝试通过out_trade_no匹配:', outTradeNo);
        updateResult = await db.collection('shop_order').where({ out_trade_no: outTradeNo }).update({
          data: {
            pay_status: "1",
            statusmax: "2",
            openid: openid || '',
            transaction_id: transactionId,
            success_time: successTime || db.serverDate(),
            paymentTime: successTime ? new Date(successTime).getTime() : db.serverDate(),
            paymentAmount: Number(orderData.amount?.total || orderData.total_fee || 0) / 100,
            updatedAt: db.serverDate()
          }
        });

        console.log('out_trade_no匹配更新结果:', updateResult);
        if (updateResult.stats && updateResult.stats.updated > 0) {
          matchMethod = 'out_trade_no';
          
          // ============== 新增：调用推送云函数 ==============
          try {
            // 调用order-push，把订单数据传过去
            await cloud.callFunction({
              name: "order-push",
              data: {
                doc: {
                  statusmax: "2",
                  _id: outTradeNo,
                  openid: openid
                }
              }
            });
            console.log("✅ 支付成功，推送触发成功");
          } catch (e) {
            console.error("❌ 推送失败", e);
          }
          // ==================================================
        }
      }

      // 如果匹配失败，记录错误信息
      if (!matchMethod) {
        console.error('订单匹配失败，outTradeNo:', outTradeNo);
        // 记录到错误日志集合
        await db.collection('pay_notify_errors').add({
          data: {
            out_trade_no: outTradeNo,
            transaction_id: transactionId,
            error: '订单匹配失败',
            createTime: db.serverDate(),
            orderData: orderData
          }
        });
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'text/plain' },
          body: 'SUCCESS' // 即使匹配失败也返回成功，避免微信重复回调
        };
      }

      console.log('订单更新成功，匹配方式:', matchMethod, '更新数量:', updateResult.stats.updated);
      
      // 验证更新是否真正生效
      try {
        const verifyResult = await db.collection('shop_order').where({
          [matchMethod === 'order_id' ? 'order_id' : 'out_trade_no']: outTradeNo
        }).get();
        if (verifyResult.data && verifyResult.data.length > 0) {
          const updatedOrder = verifyResult.data[0];
          console.log('✅ 更新后订单状态验证:', {
            order_id: updatedOrder.order_id,
            statusmax: updatedOrder.statusmax,
            pay_status: updatedOrder.pay_status,
            transaction_id: updatedOrder.transaction_id,
            paymentAmount: updatedOrder.paymentAmount
          });
        }
      } catch (verifyError) {
        console.error('❌ 验证更新结果失败:', verifyError);
      }
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: 'SUCCESS'
      };
    } catch (updateError) {
      console.error('订单更新失败:', updateError);
      // 记录更新失败错误
      await db.collection('pay_notify_errors').add({
        data: {
          out_trade_no: outTradeNo,
          transaction_id: transactionId,
          error: updateError.message,
          createTime: db.serverDate(),
          orderData: orderData
        }
      });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: 'SUCCESS' // 即使更新失败也返回成功，避免微信重复回调
      };
    }
  } catch (err) {
    console.error('支付回调失败:', err);
    return { statusCode: 500, body: 'FAIL' };
  }
};
