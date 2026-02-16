/**
 * 手机号解密云函数 v2 - 零依赖版本
 * 解密用户手机号并更新到数据库
 */

const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * AES 解密
 */
function decrypt(encryptedData, sessionKey, iv) {
  const sessionKeyBuffer = Buffer.from(sessionKey, 'base64');
  const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
  const ivBuffer = Buffer.from(iv, 'base64');
  
  const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuffer, ivBuffer);
  decipher.setAutoPadding(true);
  
  let decoded = decipher.update(encryptedDataBuffer, null, 'utf8');
  decoded += decipher.final('utf8');
  
  return JSON.parse(decoded);
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  try {
    console.log('[user-decode-phone-v2] 调用参数:', event);
    
    // 获取 openid
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    if (!openid) {
      return {
        code: 400,
        message: '未登录',
        data: null
      };
    }
    
    const { encryptedData, iv } = event;
    
    if (!encryptedData || !iv) {
      return {
        code: 400,
        message: '缺少必要参数',
        data: null
      };
    }
    
    // 从 shop_user 集合获取 session_key
    const userRes = await db.collection('shop_user').where({ openid }).get();
    
    if (userRes.data.length === 0) {
      console.error('[user-decode-phone-v2] shop_user 集合中找不到用户:', openid);
      return {
        code: 404,
        message: '用户不存在,请重新登录',
        data: null
      };
    }
    
    const sessionKey = userRes.data[0].session_key;
    
    if (!sessionKey) {
      console.error('[user-decode-phone-v2] session_key 不存在:', openid);
      return {
        code: 400,
        message: 'session_key 已过期,请重新登录',
        data: null
      };
    }
    
    console.log('[user-decode-phone-v2] 成功获取 session_key,用户ID:', userRes.data[0]._id);
    
    // 解密手机号
    const decryptedData = decrypt(encryptedData, sessionKey, iv);
    console.log('[user-decode-phone-v2] 解密成功:', decryptedData);
    
    const phoneNumber = decryptedData.purePhoneNumber || decryptedData.phoneNumber;
    
    // 更新用户手机号到 shop_user 集合(使用刚才查询到的用户ID)
    const userId = userRes.data[0]._id;
    const updateRes = await db.collection('shop_user')
      .doc(userId)
      .update({
        data: {
          phone: phoneNumber,  // 字段名改为 phone
          updateTime: db.serverDate()
        }
      });
    
    console.log('[user-decode-phone-v2] 手机号已更新到 shop_user,用户ID:', userId);
    
    return {
      code: 200,
      message: '手机号绑定成功',
      data: {
        phoneInfo: decryptedData,
        phoneNumber: phoneNumber
      }
    };
    
  } catch (error) {
    console.error('[user-decode-phone-v2] 错误:', error);
    return {
      code: 500,
      message: error.message || '解密失败',
      data: null
    };
  }
};
