// getSystemConfig 云函数 - 从数据库获取系统配置
// 核心功能：查询 system_config 集合，返回微信支付配置
// 适配 wx-server-sdk 最新版，使用动态环境配置
const cloud = require('wx-server-sdk');

// 使用本地副本，避免依赖缺失
const { withResponse } = require('./response');

/**
 * 云函数入口函数
 * @param {Object} event - 事件参数（无特殊参数需求）
 * @param {Object} context - 上下文参数
 * @returns {Promise<Object>} 配置获取结果
 */
const handler = async (event, context) => {
  try {
    console.log('=== getSystemConfig 云函数调用开始 ===');
    console.log('接收事件参数：', event);

    // 使用动态环境初始化
    cloud.init({
      env: cloud.DYNAMIC_CURRENT_ENV
    });

    // 获取数据库实例
    const db = cloud.database();
    console.log('数据库初始化成功');

    // 查询 system_config 集合的第一条文档
    console.log('=== 开始查询系统配置 ===');
    const configResult = await db.collection('system_config').limit(1).get();

    console.log('配置查询结果：', configResult);

    // 检查文档是否存在
    if (configResult.data.length === 0) {
      throw new Error('系统配置文档不存在，请在云开发控制台创建 system_config 集合并添加配置文档');
    }

    // 获取第一条文档
    const configDoc = configResult.data[0];
    console.log('获取到配置文档：', configDoc);

    // 提取 wxpay 配置对象
    const wxpayConfig = configDoc.wxpay;
    console.log('提取到 wxpay 配置：', wxpayConfig);

    // 检查 wxpay 字段是否存在
    if (!wxpayConfig) {
      throw new Error('配置文档中缺少 wxpay 字段，请检查 system_config 集合中的文档结构');
    }

    // 检查 wxpay 配置的必要字段
    const requiredFields = ['appid', 'mchid', 'serialNo', 'privateKey', 'apiV3Key', 'notifyUrl'];
    for (const field of requiredFields) {
      if (!wxpayConfig[field]) {
        throw new Error(`wxpay 配置中缺少必要字段：${field}`);
      }
    }

    // 检查私钥格式
    if (!wxpayConfig.privateKey.includes('-----BEGIN PRIVATE KEY-----') ||
        !wxpayConfig.privateKey.includes('-----END PRIVATE KEY-----')) {
      throw new Error('私钥格式错误，必须包含完整的 BEGIN PRIVATE KEY 和 END PRIVATE KEY 标识');
    }

    console.log('=== 系统配置获取成功 ===');

    // 返回成功结果
    return {
      code: 200,
      message: '系统配置获取成功',
      data: {
        wxpay: wxpayConfig
      }
    };

  } catch (error) {
    console.error('=== getSystemConfig 云函数执行异常 ===');
    console.error('错误信息：', error.message);
    console.error('错误栈：', error.stack);
    console.error('事件参数：', event);

    // 返回错误结果
    return {
      code: 500,
      message: `系统配置获取失败：${error.message}`,
      data: {
        errorType: error.name,
        errorMessage: error.message,
        stack: error.stack
      }
    };
  } finally {
    console.log('=== getSystemConfig 云函数调用结束 ===');
  }
};

exports.main = withResponse(handler);
