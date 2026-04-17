const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const crypto = require('crypto')

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

// 微信V3回调解密函数（原生crypto，无依赖）
function decryptWechatV3(resource, key) {
  try {
    const ciphertext = Buffer.from(resource.ciphertext, 'base64')
    const nonce = Buffer.from(resource.nonce, 'utf8')
    const associatedData = Buffer.from(resource.associated_data || '', 'utf8')
    
    const authTag = ciphertext.slice(-16)
    const data = ciphertext.slice(0, -16)
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key), nonce)
    decipher.setAuthTag(authTag)
    decipher.setAAD(associatedData)
    
    let plaintext = decipher.update(data, null, 'utf8')
    plaintext += decipher.final('utf8')
    return JSON.parse(plaintext)
  } catch (e) {
    console.error('解密失败', e)
    return null
  }
}

// 微信V3回调固定返回SUCCESS
const SUCCESS_RES = {
  statusCode: 200,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ code: "SUCCESS", message: "成功" })
}

exports.main = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, ...SUCCESS_RES.headers }

  try {
    const { headers, body: rawBody } = event;
    const normalizedHeaders = normalizeHeaders(headers);

    // 验证V3签名
    if (normalizedHeaders['wechatpay-signature']) {
      if (!verifyV3Signature(normalizedHeaders, rawBody)) {
        console.error('V3 签名失败');
        return SUCCESS_RES;
      }
    }

    // 1. 接收 V3 回调JSON
    const notifyData = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody
    console.log('【微信V3退款回调】完整数据：', notifyData)

    // 2. 只处理退款成功事件
    if (notifyData.event_type !== 'REFUND.SUCCESS') {
      return SUCCESS_RES
    }

    // 3. 解密V3加密数据
    const refundInfo = decryptWechatV3(notifyData.resource, PAY_CONFIG.apiV3Key)
    if (!refundInfo) {
      console.error('解密失败')
      return SUCCESS_RES
    }
    console.log('【解密后】退款数据：', refundInfo)

    // 4. 提取关键字段
    const out_refund_no = refundInfo.out_refund_no // 商户退款单号
    const refund_status = 'SUCCESS' // V3回调为REFUND.SUCCESS即成功

    // 5. 查询退款单（你的原有逻辑）
    const refundRes = await db.collection('shop_refund').where({
      out_refund_no: out_refund_no
    }).get()

    if (refundRes.data.length === 0) {
      console.log('退款单不存在：', out_refund_no)
      return SUCCESS_RES
    }

    const refundInfoDb = refundRes.data[0]
    const order_id = refundInfoDb.order_id
    const timestamp = Date.now()

    // 6. 状态更新（完全沿用你原有字段！）
    const refund_status_text = '退款成功'
    const refund_result_text = '退款成功'
    const orderStatus = '9'

    // 7. 更新退款单
    await db.collection('shop_refund').doc(refundInfoDb._id).update({
      data: {
        refund_status: refund_status_text,
        refund_result_status: refund_result_text,
        refund_time: timestamp,
        update_time: timestamp
      }
    })

    // 8. 更新订单状态
    await db.collection('shop_order').where({ order_id: order_id }).update({
      data: {
        statusmax: orderStatus,
        update_time: timestamp
      }
    })

    console.log('✅ 退款状态更新完成：订单', order_id)
    return SUCCESS_RES

  } catch (err) {
    console.error('【回调异常】', err)
    // 无论如何都返回成功，避免微信重试
    return SUCCESS_RES
  }
}