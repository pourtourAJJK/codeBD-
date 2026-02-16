// 微信支付配置文件 - wechatpay-node-v3@1.2.0 版本
// 【修复点：配置单独抽离】所有微信支付配置集中管理，便于用户替换

module.exports = {
  // 小程序 AppID
  // 获取地址：微信公众平台（mp.weixin.qq.com）→ 设置 → 开发设置 → 开发者ID
  // 格式要求：wx开头的字符串，如 wx1234567890abcdef
  appid: process.env.PAY_APPID,
  
  // 商户号 MCHID
  // 获取地址：微信支付商户平台（pay.weixin.qq.com）→ 账户中心 → 商户信息 → 商户号
  // 格式要求：纯数字字符串，如 1234567890
  mchid: process.env.PAY_MCH_ID,
  
  // 证书序列号 Serial No
  // 获取地址：微信支付商户平台 → 账户中心 → API安全 → 证书管理 → 查看证书详情
  // 格式要求：32位字母数字组合，如 ABCDEF1234567890ABCDEF1234567890
  serialNo: process.env.PAY_SERIAL_NO,
  
  // 商户API私钥 Private Key
  // 获取地址：微信支付商户平台 → 账户中心 → API安全 → 证书管理 → 下载证书
  // 格式要求：必须包含完整的 BEGIN PRIVATE KEY 和 END PRIVATE KEY 标识
  // 注意事项：
  // 1. 私钥不能有换行符问题，直接复制下载的 .key 文件内容
  // 2. 私钥必须是完整的，包含所有换行和标识
  // 3. 不能有多余的空格或注释
  privateKey: process.env.PAY_PRIVATE_KEY,
  
  // 微信支付 API v3 密钥
  // 获取地址：微信支付商户平台 → 账户中心 → API安全 → API v3密钥 → 设置
  // 格式要求：32位字母数字组合，如 1234567890abcdef1234567890abcdef
  // 注意事项：设置后请妥善保存，如遗忘需重置
  apiV3Key: process.env.PAY_API_KEY,
  
  // 微信支付平台证书 Public Key
  // 获取地址：微信支付商户平台 → 账户中心 → API安全 → 证书管理 → 下载证书
  // 格式要求：必须包含完整的 BEGIN CERTIFICATE 和 END CERTIFICATE 标识
  // 注意事项：这是微信支付平台的证书，不是商户证书
  publicKey: process.env.PAY_PUBLIC_KEY,
  
  // 支付结果通知地址 Notify URL
  // 获取地址：云开发控制台 → pay-notify云函数 → 配置 → 云函数URL化
  // 格式要求：
  // 1. 必须是HTTPS协议
  // 2. 域名必须经过ICP备案
  // 3. 不能携带查询参数
  // 注意：请将下方地址替换为您在云开发控制台获取的云函数URL化地址
  notifyUrl: 'https://fuxididai8888-5g9tptvfb7056681-1397228946.ap-shanghai.app.tcloudbase.com'
};