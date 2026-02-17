// 微信支付核心云函数 - 原生API实现
// 【修复点：彻底替换wechatpay-node-v3】改用https直接调用微信支付原生API
// 适配微信支付v3 API，支持小程序支付统一下单

// 导入依赖
const cloud = require('wx-server-sdk');
const { withResponse } = require('../utils/response');

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
        const res = await cloud.callFunction({
          name: 'wxpay_refund',
          data: params
        });
        return {
          code: 200,
          message: '退款申请成功',
          data: res.result
        };
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
