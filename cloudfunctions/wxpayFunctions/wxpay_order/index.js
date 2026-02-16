// ==================== 微信支付模块初始化 ====================
const cloud = require('wx-server-sdk');
const { withResponse } = require('../../utils/response');

const https = require('https');
const crypto = require('crypto');

// 初始化云环境
cloud.init({ 
  env: 'fuxididai8888-5g9tptvfb7056681',
  traceUser: true // 记录用户访问信息
});

// 数据库引用
const db = cloud.database();

// 微信支付配置信息，建议从环境变量或数据库中获取
const WECHAT_PAY_CONFIG = {
  appid: process.env.PAY_APPID,           // 小程序AppID
  mchid: process.env.PAY_MCH_ID,           // 商户号
  apiV3Key: process.env.PAY_API_KEY,       // APIv3密钥（32位）
  serialNo: process.env.PAY_SERIAL_NO, // 证书序列号（32位十六进制）
  
  // 私钥内容，建议从安全存储中获取
  privateKey: process.env.PAY_PRIVATE_KEY,
  
  // 支付回调地址，需要在微信支付后台配置
  notifyUrl: 'https://fuxididai8888-5g9tptvfb7056681-1397228946.ap-shanghai.app.tcloudbase.com'
};

// ==================== 工具函数 ====================
class Logger {
  static log(module, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${module}] ${message}`;
    
    if (data) {
      console.log(logMessage, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    } else {
      console.log(logMessage);
    }
  }
  
  static error(module, message, error = null) {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] [${module}] ERROR: ${message}`;
    
    if (error) {
      console.error(errorMessage, error.message || error);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    } else {
      console.error(errorMessage);
    }
  }
}

/**
 * 验证微信支付配置
 */
function validateWechatPayConfig(config, wxContext) {
  Logger.log('CONFIG', '开始验证微信支付配置');
  
  const errors = [];
  
  // 1. 验证基本配置
  if (!config.appid || config.appid.length < 18) {
    errors.push('AppID格式不正确');
  }
  
  if (!config.mchid || config.mchid.length !== 10) {
    errors.push('商户号(mchid)必须为10位数字');
  }
  
  if (!config.apiV3Key || config.apiV3Key.length !== 32) {
    errors.push('APIv3密钥必须为32位字符串');
  }
  
  if (!config.serialNo || !/^[0-9A-Fa-f]{32}$/.test(config.serialNo)) {
    errors.push('证书序列号必须为32位十六进制字符串');
  }
  
  // 2. 验证密钥格式
  if (!config.privateKey || !config.privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    errors.push('私钥格式不正确，必须包含BEGIN PRIVATE KEY标记');
  }
  
  // 3. 验证小程序AppID匹配
  if (wxContext.APPID && config.appid !== wxContext.APPID) {
    errors.push(`配置的AppID(${config.appid})与小程序AppID(${wxContext.APPID})不匹配`);
  }
  
  // 4. 验证回调地址
  if (!config.notifyUrl || !config.notifyUrl.startsWith('https://')) {
    errors.push('回调地址必须使用HTTPS协议');
  }
  
  if (errors.length === 0) {
    Logger.log('CONFIG', '微信支付配置验证通过');
    return { isValid: true };
  } else {
    Logger.error('CONFIG', '微信支付配置验证失败', errors);
    return { 
      isValid: false, 
      errors: errors 
    };
  }
}

/**
 * 解析支付金额
 */
function parsePaymentAmount(amountInput) {
  Logger.log('AMOUNT', '解析支付金额', { input: amountInput });
  
  let totalAmount = 0;
  
  try {
    if (typeof amountInput === 'number') {
      totalAmount = Math.round(amountInput * 100); // 转换为分
    } else if (typeof amountInput === 'string') {
      totalAmount = Math.round(parseFloat(amountInput) * 100);
    } else if (amountInput && typeof amountInput === 'object' && amountInput.total) {
      totalAmount = Math.round(parseFloat(amountInput.total) * 100);
    } else {
      throw new Error('支付金额格式不正确');
    }
    
    // 验证金额范围
    if (isNaN(totalAmount) || totalAmount <= 0) {
      throw new Error(`支付金额必须大于0，当前值: ${totalAmount / 100}元`);
    }
    
    // 微信支付金额限制，最小支付金额为0.01元（1分）
    if (totalAmount < 1) {
      throw new Error('支付金额不能小于0.01元');
    }
    
    Logger.log('AMOUNT', '支付金额解析成功', { 分: totalAmount, 元: totalAmount / 100 });
    return { success: true, amount: totalAmount };
  } catch (error) {
    Logger.error('AMOUNT', '支付金额解析失败', error);
    return { success: false, error: error.message };
  }
}

/**
 * 生成商户订单号
 */
function generateOutTradeNo(orderId = '') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const outTradeNo = `ORDER${timestamp}${random}${orderId ? '_' + orderId : ''}`;
  
  Logger.log('ORDER', '生成商户订单号', outTradeNo);
  return outTradeNo;
}

/**
 * 生成微信支付API请求签名
 */
const generateRequestSign = (method, url, timestamp, nonce, body) => {
  try {
    Logger.log('SIGN', '开始生成请求签名');
    
    // 构建签名信息：method + url + timestamp + nonce + body
    const signStr = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`;
    
    Logger.log('SIGN', '签名内容', signStr);
    
    // 使用私钥进行RSA-SHA256签名
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signStr);
    const signature = sign.sign(WECHAT_PAY_CONFIG.privateKey, 'base64');
    
    Logger.log('SIGN', '签名结果', signature.substring(0, 20) + '...');
    Logger.log('SIGN', '生成签名过程成功');
    
    return signature;
  } catch (error) {
    Logger.error('SIGN', '生成签名过程失败', error);
    throw new Error(`生成请求签名失败: ${error.message}`);
  }
};

/**
 * 调用微信支付API
 */
async function callWechatPayApi(urlPath, method, data) {
  Logger.log('API', '调用微信支付API', { url: urlPath, method: method });
  
  return new Promise((resolve, reject) => {
    const url = `/v3/pay${urlPath}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.random().toString(36).substring(2, 17);
    const body = JSON.stringify(data);
    
    // 生成请求签名
    const signature = generateRequestSign(method, url, timestamp, nonce, body);
    
    // 构建请求头
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${WECHAT_PAY_CONFIG.mchid}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${WECHAT_PAY_CONFIG.serialNo}",signature="${signature}"`
    };
    
    // 构建请求选项
    const options = {
      hostname: 'api.mch.weixin.qq.com',
      path: url,
      method: method,
      headers: headers
    };
    
    // 发起请求
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            reject(new Error(`API请求失败: ${parsedData.message || '未知错误'}`));
          }
        } catch (error) {
          reject(new Error(`响应解析失败: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(body);
    req.end();
  });
}

// ==================== 主函数 ====================
const handler = async (event, context) => {
  // 使用try-catch包裹，确保函数正常执行
  try {
    Logger.log('MAIN', '微信支付统一下单开始执行');
    Logger.log('MAIN', '收到请求参数', event);
    
    // ==================== 1. 参数验证 ====================
    if (!event) {
      Logger.error('VALIDATION', '请求参数为空');
      return {
        code: 400,
        success: false,
        message: '请求参数不能为空'
      };
    }
    
    // 获取用户OpenID
    const wxContext = cloud.getWXContext();
    Logger.log('CONTEXT', '获取用户上下文', {
      openid: wxContext.OPENID,
      appid: wxContext.APPID
    });
    
    if (!wxContext.OPENID) {
      Logger.error('VALIDATION', '用户未登录，OpenID获取失败');
      return {
        code: 401,
        success: false,
        message: '用户未登录，请先登录'
      };
    }
    
    // 验证必填参数
    const requiredFields = ['description', 'amount'];
    const missingFields = requiredFields.filter(field => !event[field]);
    
    if (missingFields.length > 0) {
      Logger.error('VALIDATION', '缺少必填参数', missingFields);
      return {
        code: 400,
        success: false,
        message: `缺少必填参数: ${missingFields.join(', ')}`
      };
    }
    
    // ==================== 2. 支付金额处理 ====================
    const amountResult = parsePaymentAmount(event.amount);
    if (!amountResult.success) {
      return {
        code: 400,
        success: false,
        message: amountResult.error
      };
    }
    
    const totalAmount = amountResult.amount;
    
    // ==================== 3. 配置验证 ====================
    const configValidation = validateWechatPayConfig(WECHAT_PAY_CONFIG, wxContext);
    if (!configValidation.isValid) {
      return {
        code: 500,
        success: false,
        message: `微信支付配置错误: ${configValidation.errors.join('; ')}`
      };
    }
    
    // ==================== 4. 准备支付参数 ====================
    const outTradeNo = event.out_trade_no || generateOutTradeNo(event.orderId);
    const description = event.description || '硒养山泉微信支付';
    
    const paymentParams = {
      description: description,
      out_trade_no: outTradeNo,
      notify_url: WECHAT_PAY_CONFIG.notifyUrl,
      amount: {
        total: totalAmount,
        currency: 'CNY'
      },
      payer: {
        openid: wxContext.OPENID
      }
    };
    
    Logger.log('PARAMS', '构建支付请求参数', paymentParams);
    
    // ==================== 5. 调用微信支付API ====================
    Logger.log('API', '调用微信支付统一下单API: /transactions/jsapi');
    
    let transactionResult;
    try {
      transactionResult = await callWechatPayApi('/transactions/jsapi', 'POST', paymentParams);
      Logger.log('API', '微信支付API响应成功', transactionResult);
    } catch (apiError) {
      Logger.error('API', '微信支付API请求失败', apiError);
      
      // 处理微信支付错误信息
      let errorMessage = '微信支付统一下单失败';
      if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      return {
        code: 500,
        success: false,
        message: errorMessage,
        detail: apiError.message
      };
    }
    
    // 验证API返回结果
    if (!transactionResult || !transactionResult.prepay_id) {
      Logger.error('API', '微信支付API返回结果异常', transactionResult);
      return {
        code: 500,
        success: false,
        message: '微信支付返回结果异常，缺少prepay_id'
      };
    }
    
    // ==================== 6. 生成前端支付参数 ====================
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = Math.random().toString(36).substring(2, 17);
    const packageStr = `prepay_id=${transactionResult.prepay_id}`;
    
    // 生成签名
    let paySign;
    try {
      const signMessage = `${WECHAT_PAY_CONFIG.appid}\n${timestamp}\n${nonceStr}\n${packageStr}\n`;
      Logger.log('SIGN', '生成支付签名', { message: signMessage });
      
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(signMessage);
      paySign = sign.sign(WECHAT_PAY_CONFIG.privateKey, 'base64');
      
      Logger.log('SIGN', '支付签名生成成功');
    } catch (signError) {
      Logger.error('SIGN', '支付签名生成失败', signError);
      return {
        code: 500,
        success: false,
        message: '支付签名生成失败',
        detail: signError.message
      };
    }
    
    // ==================== 7. 构建返回结果 ====================
    const paymentResult = {
      timeStamp: timestamp,
      nonceStr: nonceStr,
      package: packageStr,
      signType: 'RSA',
      paySign: paySign,
      prepayId: transactionResult.prepay_id,
      outTradeNo: outTradeNo
    };
    
    Logger.log('SUCCESS', '微信支付统一下单成功', {
      outTradeNo: outTradeNo,
      amount: totalAmount / 100,
      prepayId: transactionResult.prepay_id
    });
    
    // 可选：将支付信息存储到数据库（记录日志）
    try {
      await db.collection('payment_logs').add({
        data: {
          openid: wxContext.OPENID,
          out_trade_no: outTradeNo,
          prepay_id: transactionResult.prepay_id,
          amount: totalAmount,
          description: description,
          status: 'created',
          created_at: db.serverDate(),
          updated_at: db.serverDate()
        }
      });
    } catch (dbError) {
      // 数据库记录失败不影响主流程，只记录日志
      Logger.error('DB', '创建支付日志失败', dbError);
    }
    
    // 返回成功结果
    return {
      code: 0,
      success: true,
      message: '支付统一下单成功',
      data: paymentResult,
      orderInfo: {
        outTradeNo: outTradeNo,
        amount: totalAmount / 100,
        description: description
      }
    };
    
  } catch (unexpectedError) {
    // 处理未预期的异常
    Logger.error('UNEXPECTED', '发生未预期异常', unexpectedError);
    
    return {
      code: 500,
      success: false,
      message: '系统内部错误，请稍后重试',
      error: unexpectedError.message,
      timestamp: new Date().toISOString()
    };
  }
};

// ==================== 使用说明 ====================
/**
 * 使用说明：
 * 1. 请将私钥和证书替换为真实的证书内容
 * 2. 确保回调地址已在微信支付后台正确配置
 * 3. 建议将配置信息（私钥、APIv3密钥等）存储在环境变量中
 * 4. 生产环境应添加更多错误处理和安全措施
 * 5. 定期更新证书，防止证书过期
 */

exports.main = withResponse(handler);
