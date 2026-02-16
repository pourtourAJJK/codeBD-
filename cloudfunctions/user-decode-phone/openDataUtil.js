/**
 * 微信开放数据处理工具类
 * 提供签名校验、数据解密等功能
 */
const crypto = require("crypto");

const openDataUtil = {
  /**
   * 校验签名
   * @param {string} rawData - 原始数据
   * @param {string} sessionKey - 会话密钥
   * @param {string} signature - 签名
   * @return {boolean} 签名是否有效
   */
  verifySignature(rawData, sessionKey, signature) {
    try {
      // 按照微信官方规范，使用 sha1 算法
      const sha1 = crypto.createHash("sha1");
      sha1.update(rawData + sessionKey);
      const expectedSignature = sha1.digest("hex");
      return expectedSignature === signature;
    } catch (error) {
      console.error("签名校验失败:", error);
      return false;
    }
  },

  /**
   * 解密敏感数据
   * @param {string} encryptedData - 加密数据
   * @param {string} sessionKey - 会话密钥
   * @param {string} iv - 初始化向量
   * @return {object|null} 解密后的数据或null
   */
  decryptData(encryptedData, sessionKey, iv) {
    try {
      // Base64解码
      const sessionKeyBuffer = Buffer.from(sessionKey, "base64");
      const encryptedDataBuffer = Buffer.from(encryptedData, "base64");
      const ivBuffer = Buffer.from(iv, "base64");

      // AES-128-CBC 解密
      const decipher = crypto.createDecipheriv("aes-128-cbc", sessionKeyBuffer, ivBuffer);
      decipher.setAutoPadding(true);
      let decoded = decipher.update(encryptedDataBuffer, "binary", "utf8");
      decoded += decipher.final("utf8");

      // 解析JSON
      const data = JSON.parse(decoded);
      return data;
    } catch (error) {
      console.error("数据解密失败:", error);
      return null;
    }
  },

  /**
   * 校验watermark
   * @param {object} watermark - 水印数据
   * @param {string} appid - 小程序appid
   * @return {boolean} 水印是否有效
   */
  verifyWatermark(watermark, appid) {
    try {
      // 校验appid
      if (watermark.appid !== appid) {
        console.error("watermark appid 校验失败");
        return false;
      }

      // 校验timestamp（5分钟内有效）
      const now = Date.now() / 1000;
      const fiveMinutesAgo = now - 5 * 60;
      if (watermark.timestamp < fiveMinutesAgo) {
        console.error("watermark timestamp 校验失败");
        return false;
      }

      return true;
    } catch (error) {
      console.error("watermark 校验失败:", error);
      return false;
    }
  },

  /**
   * 检查cloudID是否有效
   * @param {string} cloudID - 云ID
   * @return {boolean} cloudID是否有效
   */
  isValidCloudID(cloudID) {
    return typeof cloudID === "string" && cloudID.length > 0;
  },

  /**
   * 生成安全的token
   * @param {string} openid - 用户openid
   * @return {string} 安全的token
   */
  generateToken(openid) {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 10);
    const hash = crypto.createHash("sha256");
    hash.update(openid + timestamp + randomStr);
    return "token_" + hash.digest("hex");
  },
};

module.exports = openDataUtil;