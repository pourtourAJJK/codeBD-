﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// 微信支付核心云函数 - 原生API实现
// 【修复点：彻底替换wechatpay-node-v3】改用https直接调用微信支付原生API
// 适配微信支付v3 API，支持小程序支付统一下单

// 导入依赖
const cloud = require('wx-server-sdk');
// 使用本地 response 副本，避免依赖丢失
const { withResponse } = require('./response');

const https = require('https');
const crypto = require('crypto');

// 【修复点1：配置单独抽离】引入微信支付配置
const config = require('./config');

// 【新增：引入证书处理工具】解决PEM格式解析问题
const certUtils = require('./certUtils');

// 初始化云开发环境，使用默认环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 生成唯一随机字符串
 * @param {number} length - 随机字符串长度
 * @returns {string} 随机字符串
 */
const generateNonce = (length = 16) => {
  return Math.random().toString(36).substring(2, 2 + length);
};

/**
 * 生成前端调用wx.requestPayment需要的参数
 * @param {string} prepayId - 微信支付prepay_id
 * @returns {Object} 前端支付参数
 */
const generatePaymentParams = (prepayId) => {
  console.log('=== 开始生成前端支付参数 ===');

  try {
    // 使用certUtils中专门的前端支付参数生成函数
    const paymentParams = certUtils.generatePaymentParams(
      prepayId,
      config.appid,
      config.privateKey
    );

    console.log('生成的前端支付参数：', paymentParams);
    console.log('=== 前端支付参数生成成功 ===');

    return paymentParams;
  } catch (error) {
    console.error('生成前端支付参数失败：', error.message);
    throw new Error(`生成支付签名失败：${error.message}`);
  }
};

/**
 * 小程序支付统一下单（原生API实现）
 * @param {Object} params - 支付参数
 * @param {string} params.description - 支付描述
 * @param {string} params.out_trade_no - 商户订单号
 * @param {number} params.amount - 支付金额（分）
 * @param {string} params.openid - 用户openid
 * @param {string} [params.appid] - 小程序appid
 * @param {string} [params.notify_url] - 通知地址（可选，默认使用配置中的地址）
 * @returns {Promise<Object>} 包含前端支付参数的结果
 */
const createWxpayOrder = async (params) => {
  try {
    console.log('=== 开始创建微信支付订单 ===');
    console.log('接收参数：', {
      description: params.description,
      out_trade_no: params.out_trade_no,
      amount: params.amount,
      openid: params.openid.substring(0, 10) + '...',
      appid: params.appid || '未传递'
    });

    // appid一致性校验
    if (params.appid && params.appid !== config.appid) {
      throw new Error(`appid不匹配：传递的appid(${params.appid})与配置的appid(${config.appid})不一致`);
    }

    // 参数校验
    if (!params.description) {
      throw new Error('缺少支付描述');
    }

    if (!params.out_trade_no) {
      throw new Error('缺少商户订单号');
    }

    if (typeof params.amount !== 'number' || params.amount <= 0) {
      throw new Error('支付金额必须大于0');
    }

    if (!params.openid) {
      throw new Error('缺少用户openid');
    }

    const notifyUrl = params.notify_url || config.notifyUrl;
    const total = Math.round(params.amount);

    const requestBody = {
      appid: config.appid,
      mchid: config.mchid,
      description: params.description,
      out_trade_no: params.out_trade_no,
      notify_url: notifyUrl,
      amount: {
        total: total,
        currency: 'CNY'
      },
      payer: {
        openid: params.openid
      }
    };

    const bodyStr = JSON.stringify(requestBody);

    const method = 'POST';
    const url = '/v3/pay/transactions/jsapi';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = generateNonce();

    const signature = certUtils.generateWechatPaySignature(method, url, timestamp, nonce, bodyStr, config.privateKey);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'WeChatPay/JsapiPay v1.0',
      'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchid}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${config.serialNo}",signature="${signature}"`
    };

    console.log('=== 调用微信支付原生API ===');
    console.log('请求URL：', `https://api.mch.weixin.qq.com${url}`);
    console.log('请求头：', {
      'Content-Type': headers['Content-Type'],
      'Accept': headers['Accept'],
      'User-Agent': headers['User-Agent'],
      'Authorization': headers['Authorization'].substring(0, 50) + '...'
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
            resolve({ status: res.statusCode, data: parsedData });
          } catch (error) {
            reject(new Error(`响应解析失败：${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(bodyStr);
      req.end();
    });

    console.log('=== 微信支付API调用完成 ===');
    console.log('响应状态：', response.status);
    console.log('响应数据：', response.data);

    if (response.status !== 200) {
      console.error('微信支付API返回错误状态码：', response.status);
      if (response.data.code) {
        throw new Error(`微信支付API错误：${response.data.code} - ${response.data.message || '未知错误'}`);
      } else {
        throw new Error(`微信支付API返回错误状态码：${response.status}`);
      }
    }

    if (!response.data.prepay_id) {
      console.error('微信支付API响应中缺少prepay_id，完整响应：', response.data);
      throw new Error('微信支付API响应中缺少prepay_id');
    }

    const prepayId = response.data.prepay_id;
    console.log('获取到的prepay_id：', prepayId);

    const paymentParams = generatePaymentParams(prepayId);

    return {
      ...response.data,
      payment_params: paymentParams
    };

  } catch (error) {
    console.error('=== 微信支付API调用失败 ===');
    console.error('错误信息：', error.message);
    console.error('错误栈：', error.stack);

    if (error.response) {
      console.error('API响应错误：', error.response.status, error.response.data);
      throw new Error(`微信支付API调用失败：${error.response.data?.message || '未知错误'}`);
    } else if (error.request) {
      console.error('API请求错误：', error.request);
      throw new Error('微信支付API请求失败，网络异常');
    } else {
      throw new Error(`微信支付下单失败：${error.message}`);
    }
  }
};

/**
 * 查询微信支付订单
 * @param {Object} params - 查询参数
 * @param {string} params.out_trade_no - 商户订单号
 * @returns {Promise<Object>} 订单查询结果
 */
const queryWxpayOrder = async (params) => {
  try {
    console.log('=== 开始查询微信支付订单 ===');
    console.log('查询订单号：', params.out_trade_no);

    if (!params.out_trade_no) {
      throw new Error('缺少商户订单号');
    }

    const method = 'GET';
    const url = `/v3/pay/transactions/out-trade-no/${params.out_trade_no}?mchid=${config.mchid}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = generateNonce();
    const bodyStr = '';

    const signature = certUtils.generateWechatPaySignature(method, url, timestamp, nonce, bodyStr, config.privateKey);

    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'WeChatPay/JsapiPay v1.0',
      'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchid}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${config.serialNo}",signature="${signature}"`
    };

    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.mch.weixin.qq.com',
        path: url,
        method: 'GET',
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
            resolve({ status: res.statusCode, data: parsedData });
          } catch (error) {
            reject(new Error(`响应解析失败：${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });

    console.log('=== 订单查询成功 ===');
    console.log('响应数据：', response.data);

    return response.data;

  } catch (error) {
    console.error('=== 订单查询失败 ===');
    console.error('错误信息：', error.message);
    throw new Error(`查询微信支付订单失败：${error.message}`);
  }
};

/**
 * 微信支付退款（原生API实现）
 * @param {Object} params - 退款参数
 * @param {string} params.transaction_id - 微信支付交易单号
 * @param {string} params.out_refund_no - 商户退款单号
 * @param {number} params.refundFee - 退款金额
 * @param {number} params.totalFee - 订单总金额
 * @param {string} [params.reason] - 退款原因
 * @returns {Promise<Object>} 退款结果
 */
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
      },
       // 🔥 退款回调通知地址
       notify_url: "https://fuxididai8888-5g9tptvfb7056681-1397228946.ap-shanghai.app.tcloudbase.com/refund-notify"
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
  try {
    console.log('=== wxpayFunctions 云函数调用开始 ===');
    console.log('接收事件：', event);

    const { type, ...params } = event;

    switch (type) {
      case 'create_payment_order': {
        const result = await createWxpayOrder(params);
        return {
          code: 200,
          message: '微信支付订单创建成功',
          data: result
        };
      }

      case 'query_order': {
        const result = await queryWxpayOrder(params);
        return {
          code: 200,
          message: '订单查询成功',
          data: result
        };
      }

      case 'wxpay_query_order_by_out_trade_no': {
        const result = await queryWxpayOrder(params);
        return {
          code: 200,
          message: '订单查询成功',
          data: result
        };
      }

      case 'wxpay_refund': {
        // ====================== 新增：退款审核校验（必须复制） ======================
        const db = cloud.database();
        
        // 接收Web后台传递的退款单ID
        const { refundId } = event;
        if (!refundId) {
          return { code: 400, msg: "退款单ID不能为空" };
        }
        
        // 查询退款单信息，校验审核状态
        const refundRes = await db.collection('shop_refund').doc(refundId).get();
        const refundInfo = refundRes.data;
        if (!refundInfo) {
          return { code: 400, msg: "退款单不存在" };
        }
        
        // 核心校验：未审核通过 → 禁止退款
        if (refundInfo.audit_status !== "通过") {
          return {
            code: 400,
            msg: "未通过商家审核，无法发起微信退款"
          };
        }
        
        // 校验必填字段（微信退款必须要的）
        const transaction_id = refundInfo.transaction_id; // 微信支付交易号
        const refund_fee = refundInfo.refund_amount;     // 退款金额
        const total_fee = refundInfo.total_amount;        // 订单总金额

        if (!transaction_id) {
          return { code: 500, message: "缺少微信交易号 transaction_id" };
        }
        if (!refund_fee || !total_fee) {
          return { code: 500, message: "退款金额/订单金额不能为空" };
        }
        // ======================================================================
        
        const timestamp = new Date().toISOString();
        const orderId = refundInfo.order_id || '未提供';
        // 直接用数据库里原本的退款单号，不重新生成！
        const outRefundNo = refundInfo.out_refund_no;
        const maskedTransactionId = transaction_id.substring(0, 10) + '...';
        
        console.log(`[${timestamp}] [wxpayFunctions-wxpay_refund-开始] [订单ID:${orderId}] [退款单号:${outRefundNo}] 接收退款请求`);
        console.log(`[${timestamp}] [wxpayFunctions-wxpay_refund-参数] [订单ID:${orderId}] 支付单号:${maskedTransactionId}, 退款金额:${refund_fee}, 订单总金额:${total_fee}`);
        
        try {
          // ✅ 修复：使用从数据库查询到的退款信息调用 createWxpayRefund 函数
          const result = await createWxpayRefund({
            transaction_id,
            out_refund_no: outRefundNo,
            refundFee: refund_fee,
            totalFee: total_fee,
            reason: refundInfo.reason
          });
          
          console.log(`[${timestamp}] [wxpayFunctions-wxpay_refund-返回] [订单ID:${orderId}] [退款单号:${outRefundNo}] 退款处理完成`);
          
          return {
            code: 200,
            message: '退款申请成功',
            data: result,
            out_refund_no: result.out_refund_no || outRefundNo
          };
        } catch (error) {
          console.error(`[${new Date().toISOString()}] [wxpayFunctions-wxpay_refund-异常] [订单ID:${orderId}] [退款单号:${outRefundNo}] 退款申请失败`);
          console.error(`[${new Date().toISOString()}] [wxpayFunctions-wxpay_refund-异常详情] [订单ID:${orderId}] 错误信息:`, error.message);
          console.error(`[${new Date().toISOString()}] [wxpayFunctions-wxpay_refund-异常详情] [订单ID:${orderId}] 错误堆栈:`, error.stack);
          return {
            code: 500,
            message: `退款申请失败：${error.message}`,
            data: {
              errorType: error.name,
              errorMessage: error.message
            }
          };
        }
      }

      default: {
        const errorMsg = `不支持的请求类型：${type}`;
        console.error(errorMsg);
        return {
          code: 500,
          message: errorMsg,
          data: {}
        };
      }
    }
  } catch (error) {
    console.error('=== wxpayFunctions 云函数执行异常 ===');
    console.error('错误信息：', error.message);
    console.error('错误栈：', error.stack);
    console.error('事件参数：', event);

    return {
      code: 500,
      message: `微信支付处理失败：${error.message}`,
      data: {
        errorType: error.name,
        errorMessage: error.message,
        stack: error.stack
      }
    };
  } finally {
    console.log('=== wxpayFunctions 云函数调用结束 ===');
  }
};

exports.main = withResponse(handler);
