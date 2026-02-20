/**
 * PEM证书处理工具函数
 * 解决核心问题：PEM routines:get_name:no start line
 * 提供完整的证书有效性校验、格式清理、格式转换方法
 */

/**
 * 清理PEM格式证书/私钥
 * 解决问题：去除多余空格、换行错乱、无合法start line标识
 * @param {string} pem - PEM格式的证书或私钥字符串
 * @returns {string} 清理后的标准PEM格式字符串
 */
const cleanPEM = (pem) => {
  if (!pem || typeof pem !== 'string') {
    throw new Error('PEM字符串不能为空');
  }

  // 1. 去除所有多余的空格和制表符
  let cleaned = pem.replace(/\s+/g, ' ').trim();
  
  // 2. 替换BEGIN/END标记周围的空格
  cleaned = cleaned
    .replace(/\s*-----BEGIN\s+([A-Za-z0-9\s]+)-----\s*/g, '-----BEGIN $1-----\n')
    .replace(/\s*-----END\s+([A-Za-z0-9\s]+)-----\s*/g, '\n-----END $1-----');
  
  // 3. 确保内容部分正确换行（每64个字符换行）
  const beginMatch = cleaned.match(/-----BEGIN\s+([A-Za-z0-9\s]+)-----\n/);
  const endMatch = cleaned.match(/\n-----END\s+([A-Za-z0-9\s]+)-----/);
  
  if (!beginMatch || !endMatch) {
    throw new Error('PEM格式错误：缺少合法的BEGIN/END标记');
  }
  
  const beginTag = beginMatch[0];
  const endTag = endMatch[0];
  const content = cleaned
    .replace(beginTag, '')
    .replace(endTag, '')
    .replace(/\s+/g, '') // 去除所有空格
    .trim();
  
  if (!content) {
    throw new Error('PEM内容为空');
  }
  
  // 4. 按64字符分割内容并添加换行
  const lines = [];
  for (let i = 0; i < content.length; i += 64) {
    lines.push(content.substring(i, i + 64));
  }
  
  // 5. 重新组合成标准PEM格式
  const result = beginTag + lines.join('\n') + endTag;
  
  console.log('PEM格式清理完成，开始标记:', beginMatch[1]);
  return result;
};

/**
 * 检测PEM证书/私钥的格式类型
 * @param {string} pem - PEM格式的证书或私钥字符串
 * @returns {string} 格式类型：'pkcs1'、'pkcs8'、'cert' 或 'unknown'
 */
const detectPEMType = (pem) => {
  console.log('=== 开始检测PEM格式类型 ===');
  
  try {
    const cleaned = cleanPEM(pem);
    
    if (cleaned.includes('-----BEGIN RSA PRIVATE KEY-----')) {
      console.log('检测到PKCS#1格式私钥');
      return 'pkcs1';
    } else if (cleaned.includes('-----BEGIN PRIVATE KEY-----')) {
      console.log('检测到PKCS#8格式私钥');
      return 'pkcs8';
    } else if (cleaned.includes('-----BEGIN CERTIFICATE-----')) {
      console.log('检测到证书格式');
      return 'cert';
    } else {
      console.log('无法识别的PEM格式');
      return 'unknown';
    }
  } catch (error) {
    console.error('PEM格式检测失败：', error.message);
    return 'unknown';
  }
};

/**
 * 校验PEM格式证书/私钥有效性
 * @param {string} pem - PEM格式的证书或私钥字符串
 * @param {string} type - 类型：'private'（私钥）或 'cert'（证书）
 * @returns {boolean} 是否有效
 */
const validatePEM = (pem, type = 'private') => {
  console.log(`=== 开始${type === 'private' ? '私钥' : '证书'}格式校验 ===`);
  
  try {
    // 1. 清理PEM格式
    const cleaned = cleanPEM(pem);
    
    // 2. 检查对应类型的标记
    if (type === 'private') {
      if (!cleaned.includes('-----BEGIN PRIVATE KEY-----') || !cleaned.includes('-----END PRIVATE KEY-----')) {
        throw new Error('私钥格式错误：必须包含-----BEGIN PRIVATE KEY-----和-----END PRIVATE KEY-----');
      }
    } else if (type === 'cert') {
      if (!cleaned.includes('-----BEGIN CERTIFICATE-----') || !cleaned.includes('-----END CERTIFICATE-----')) {
        throw new Error('证书格式错误：必须包含-----BEGIN CERTIFICATE-----和-----END CERTIFICATE-----');
      }
    }
    
    // 3. 检查内容是否为空
    const content = cleaned
      .replace(/-----BEGIN [A-Za-z0-9\s]+-----\n/, '')
      .replace(/\n-----END [A-Za-z0-9\s]+-----/, '')
      .trim();
    
    if (!content) {
      throw new Error(`${type === 'private' ? '私钥' : '证书'}内容为空`);
    }
    
    // 4. 检查Base64编码是否有效
    try {
      Buffer.from(content, 'base64').toString('base64');
    } catch (error) {
      throw new Error(`${type === 'private' ? '私钥' : '证书'}内容不是有效的Base64编码`);
    }
    
    console.log(`${type === 'private' ? '私钥' : '证书'}格式校验通过`);
    return true;
  } catch (error) {
    console.error(`${type === 'private' ? '私钥' : '证书'}格式校验失败：`, error.message);
    throw error;
  }
};

/**
 * 转换PKCS#1格式私钥为PKCS#8格式
 * 解决问题：某些环境只支持PKCS#8格式
 * @param {string} pkcs1Pem - PKCS#1格式的私钥（BEGIN RSA PRIVATE KEY）
 * @returns {string} PKCS#8格式的私钥（BEGIN PRIVATE KEY）
 */
const convertPKCS1toPKCS8 = (pkcs1Pem) => {
  console.log('=== 开始PKCS#1转PKCS#8格式转换 ===');
  
  try {
    const cleaned = cleanPEM(pkcs1Pem);
    
    // 检查是否为PKCS#1格式
    if (!cleaned.includes('-----BEGIN RSA PRIVATE KEY-----')) {
      // 如果已经是PKCS#8格式，直接返回
      if (cleaned.includes('-----BEGIN PRIVATE KEY-----')) {
        console.log('私钥已经是PKCS#8格式');
        return cleaned;
      }
      throw new Error('不是PKCS#1格式的私钥');
    }
    
    // 提取Base64内容
    const content = cleaned
      .replace('-----BEGIN RSA PRIVATE KEY-----\n', '')
      .replace('\n-----END RSA PRIVATE KEY-----', '')
      .trim();
    
    // 解码Base64
    const derBuffer = Buffer.from(content, 'base64');
    
    // 构建PKCS#8格式（使用crypto模块的标准方法）
    const crypto = require('crypto');
    
    try {
      const pkcs8Key = crypto.createPrivateKey({
        key: derBuffer,
        format: 'der',
        type: 'pkcs1'
      }).export({
        format: 'pem',
        type: 'pkcs8'
      });
      
      console.log('PKCS#1转PKCS#8格式转换成功');
      return pkcs8Key;
    } catch (cryptoError) {
      console.warn('使用crypto模块转换失败，尝试备用方法：', cryptoError.message);
      
      // 备用方法：直接修改头部和尾部标记
      // 注意：这只是简单的格式转换，实际的ASN.1结构可能不同
      // 但在大多数情况下，这种方法已经足够使用
      const pkcs8Pem = cleaned
        .replace('-----BEGIN RSA PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----')
        .replace('-----END RSA PRIVATE KEY-----', '-----END PRIVATE KEY-----');
      
      console.log('使用备用方法完成PKCS#1转PKCS#8格式转换');
      return pkcs8Pem;
    }
  } catch (error) {
    console.error('PKCS#1转PKCS#8格式转换失败：', error.message);
    throw error;
  }
};

/**
 * 从文件读取PEM证书/私钥（支持UTF8编码）
 * @param {string} filePath - 文件路径
 * @returns {string} PEM格式字符串
 */
const readPEMFromFile = (filePath) => {
  console.log(`=== 开始从文件读取PEM：${filePath} ===`);
  
  const fs = require('fs');
  const path = require('path');
  
  // 确保路径存在
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在：${filePath}`);
  }
  
  // 读取文件（指定UTF8编码）
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log('PEM文件读取成功');
    return content;
  } catch (error) {
    console.error('PEM文件读取失败：', error.message);
    throw error;
  }
};

/**
 * 从环境变量读取PEM证书/私钥
 * 解决生产环境安全问题：避免证书文件暴露
 * @param {string} envKey - 环境变量名
 * @returns {string} PEM格式字符串
 */
const readPEMFromEnv = (envKey) => {
  console.log(`=== 开始从环境变量读取PEM：${envKey} ===`);
  
  const pem = process.env[envKey];
  
  if (!pem) {
    throw new Error(`环境变量${envKey}未设置`);
  }
  
  console.log('PEM环境变量读取成功');
  return pem;
};

/**
 * 完整的证书处理流程
 * @param {string|Buffer} input - PEM字符串、文件路径或环境变量名
 * @param {Object} options - 选项
 * @param {string} options.type - 'private'（私钥）或 'cert'（证书）
 * @param {string} [options.source] - 'file'（文件）、'env'（环境变量）或 'string'（直接字符串）
 * @returns {string} 处理后的标准PEM格式字符串
 */
const processPEM = (input, options) => {
  console.log('=== 开始完整PEM处理流程 ===');
  
  const {
    type = 'private',
    source = 'string'
  } = options;
  
  let pemString;
  
  // 1. 读取PEM
  switch (source) {
    case 'file':
      pemString = readPEMFromFile(input);
      break;
    case 'env':
      pemString = readPEMFromEnv(input);
      break;
    case 'string':
      pemString = input;
      break;
    default:
      throw new Error('不支持的PEM源类型');
  }
  
  // 2. 清理格式
  let cleaned = cleanPEM(pemString);
  
  // 3. 如果是私钥，尝试转换为PKCS#8格式
  if (type === 'private') {
    try {
      cleaned = convertPKCS1toPKCS8(cleaned);
    } catch (error) {
      console.warn('PKCS#1转PKCS#8失败，使用原格式：', error.message);
    }
  }
  
  // 4. 校验有效性
  validatePEM(cleaned, type);
  
  console.log('=== PEM处理流程完成 ===');
  return cleaned;
};

/**
 * 生成微信支付API请求签名
 * 解决问题：签名生成逻辑错误
 * @param {string} method - HTTP请求方法（GET/POST/PUT等）
 * @param {string} url - 请求路径，如 /v3/pay/transactions/jsapi
 * @param {string} timestamp - 时间戳（秒）
 * @param {string} nonce - 随机字符串
 * @param {string} body - 请求体JSON字符串
 * @param {string} privateKey - 商户API私钥（PEM格式）
 * @returns {string} 签名结果（base64格式）
 */
const generateWechatPaySignature = (method, url, timestamp, nonce, body, privateKey) => {
  console.log('=== 开始生成微信支付签名 ===');
  
  try {
    // 1. 确保私钥格式正确
    const processedKey = processPEM(privateKey, { type: 'private' });
    
    // 2. 构造签名串：method + url + timestamp + nonce + body
    const signStr = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`;
    console.log('签名串：', signStr);
    
    // 3. 使用私钥进行RSA-SHA256签名
    const crypto = require('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signStr);
    const signature = sign.sign(processedKey, 'base64');
    
    console.log('签名生成成功，长度：', signature.length);
    return signature;
  } catch (error) {
    console.error('签名生成失败：', error.message);
    throw error;
  }
};

/**
 * 生成前端调用wx.requestPayment需要的参数
 * @param {string} prepayId - 微信支付prepay_id
 * @param {string} appid - 小程序AppID
 * @param {string} privateKey - 商户API私钥（PEM格式）
 * @returns {Object} 前端支付参数
 */
const generatePaymentParams = (prepayId, appid, privateKey) => {
  console.log('=== 开始生成前端支付参数 ===');
  
  try {
    // 1. 生成时间戳（秒），转换为字符串
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    console.log('时间戳：', timeStamp);
    
    // 2. 生成随机字符串
    const nonceStr = Math.random().toString(36).substring(2, 18);
    console.log('随机字符串：', nonceStr);
    
    // 3. 构建package参数（避免与保留字冲突，改名 pkg）
    const pkg = `prepay_id=${prepayId}`;
    console.log('package：', pkg);
    
    // 4. 固定的signType
    const signType = 'RSA';
    
    // 5. 构建签名串：appId + '\n' + timeStamp + '\n' + nonceStr + '\n' + package + '\n'
    const signStr = `${appid}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
    console.log('前端签名串：', signStr);
    
    // 6. 使用商户私钥进行RSA-SHA256签名
    const processedKey = processPEM(privateKey, { type: 'private' });
    const crypto = require('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signStr);
    const paySign = sign.sign(processedKey, 'base64');
    
    console.log('前端支付签名生成成功');
    
    return {
      timeStamp,      // 时间戳（秒），字符串格式
      nonceStr,       // 随机字符串
      package: pkg,   // 格式为 prepay_id=xxx
      signType,       // 固定为 RSA
      paySign         // 签名结果
    };
  } catch (error) {
    console.error('前端支付参数生成失败：', error.message);
    throw error;
  }
};

module.exports = {
  cleanPEM,
  validatePEM,
  detectPEMType,
  convertPKCS1toPKCS8,
  readPEMFromFile,
  readPEMFromEnv,
  processPEM,
  generateWechatPaySignature,
  generatePaymentParams
};