/**
 * 环境配置
 */

// 环境类型
const ENV_TYPE = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test'
};

// 当前环境 (根据需要修改)
const CURRENT_ENV = ENV_TYPE.DEVELOPMENT;

// 环境配置
const ENV_CONFIG = {
  // 开发环境
  [ENV_TYPE.DEVELOPMENT]: {
    // API基础URL
    API_BASE_URL: 'https://dev-api.example.com',
    // 云开发环境ID
    CLOUD_ENV_ID: 'fuxididai8888-5g9tptvfb7056681',
    // 调试模式
    DEBUG: true,
    // 日志级别
    LOG_LEVEL: 'debug',
    // 微信小程序AppID
    APP_ID: 'wxf6ebbdde5f6b75bc',
    // 微信小程序AppSecret
    APP_SECRET: '1234567890abcdef1234567890abcdef',
    // 腾讯地图API密钥
    TENCENT_MAP_KEY: 'abcdef1234567890abcdef1234567890',
    // 微信支付商户号
    PAY_MCH_ID: '1738259860',
    // 微信支付API密钥
    PAY_API_KEY: 'abcdef1234567890abcdef1234567890',
    // 微信支付证书路径
    PAY_CERT_PATH: './cert/apiclient_cert.p12',
    // 支付通知回调URL
    PAY_NOTIFY_URL: 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send',
    // 退款通知回调URL
    REFUND_NOTIFY_URL: 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send',
    // 订单超时时间 (分钟)
    ORDER_TIMEOUT: 30,
    // 支付超时时间 (分钟)
    PAY_TIMEOUT: 30,
    // 配送员位置更新间隔 (秒)
    DELIVERY_POSITION_UPDATE_INTERVAL: 30,
    // 缓存过期时间 (毫秒)
    CACHE_EXPIRE_TIME: 3600000, // 1小时
    // 分页默认每页数量
    PAGE_SIZE: 10,
    // 是否开启模拟数据
    MOCK_DATA: true
  },
  
  // 生产环境
  [ENV_TYPE.PRODUCTION]: {
    // API基础URL
    API_BASE_URL: 'https://api.example.com',
    // 云开发环境ID
    CLOUD_ENV_ID: 'prod-env-id',
    // 调试模式
    DEBUG: false,
    // 日志级别
    LOG_LEVEL: 'info',
    // 微信小程序AppID
    APP_ID: 'wxabcdef1234567890',
    // 微信小程序AppSecret
    APP_SECRET: 'abcdef12345678901234567890abcdef',
    // 腾讯地图API密钥
    TENCENT_MAP_KEY: '1234567890abcdef1234567890abcdef',
    // 微信支付商户号
    PAY_MCH_ID: '0987654321',
    // 微信支付API密钥
    PAY_API_KEY: '1234567890abcdef1234567890abcdef',
    // 微信支付证书路径
    PAY_CERT_PATH: './cert/apiclient_cert.p12',
    // 支付通知回调URL
    PAY_NOTIFY_URL: 'https://api.example.com/pay/notify',
    // 退款通知回调URL
    REFUND_NOTIFY_URL: 'https://api.example.com/pay/refund/notify',
    // 订单超时时间 (分钟)
    ORDER_TIMEOUT: 30,
    // 支付超时时间 (分钟)
    PAY_TIMEOUT: 30,
    // 配送员位置更新间隔 (秒)
    DELIVERY_POSITION_UPDATE_INTERVAL: 15,
    // 缓存过期时间 (毫秒)
    CACHE_EXPIRE_TIME: 86400000, // 24小时
    // 分页默认每页数量
    PAGE_SIZE: 20,
    // 是否开启模拟数据
    MOCK_DATA: false
  },
  
  // 测试环境
  [ENV_TYPE.TEST]: {
    // API基础URL
    API_BASE_URL: 'https://test-api.example.com',
    // 云开发环境ID
    CLOUD_ENV_ID: 'test-env-id',
    // 调试模式
    DEBUG: true,
    // 日志级别
    LOG_LEVEL: 'debug',
    // 微信小程序AppID
    APP_ID: 'wxtest1234567890',
    // 微信小程序AppSecret
    APP_SECRET: 'test1234567890abcdef1234567890',
    // 腾讯地图API密钥
    TENCENT_MAP_KEY: 'test1234567890abcdef1234567890',
    // 微信支付商户号
    PAY_MCH_ID: '1234567890',
    // 微信支付API密钥
    PAY_API_KEY: 'test1234567890abcdef1234567890',
    // 微信支付证书路径
    PAY_CERT_PATH: './cert/apiclient_cert.p12',
    // 支付通知回调URL
    PAY_NOTIFY_URL: 'https://test-api.example.com/pay/notify',
    // 退款通知回调URL
    REFUND_NOTIFY_URL: 'https://test-api.example.com/pay/refund/notify',
    // 订单超时时间 (分钟)
    ORDER_TIMEOUT: 30,
    // 支付超时时间 (分钟)
    PAY_TIMEOUT: 30,
    // 配送员位置更新间隔 (秒)
    DELIVERY_POSITION_UPDATE_INTERVAL: 30,
    // 缓存过期时间 (毫秒)
    CACHE_EXPIRE_TIME: 3600000, // 1小时
    // 分页默认每页数量
    PAGE_SIZE: 10,
    // 是否开启模拟数据
    MOCK_DATA: true
  }
};

// 获取当前环境配置
const getEnvConfig = () => {
  return ENV_CONFIG[CURRENT_ENV] || ENV_CONFIG[ENV_TYPE.DEVELOPMENT];
};

// 环境配置导出
const config = getEnvConfig();

module.exports = {
  ENV_TYPE,
  CURRENT_ENV,
  config,
  getEnvConfig
};