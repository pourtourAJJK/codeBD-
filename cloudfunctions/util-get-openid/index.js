const https = require('https');
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 微信小程序 AppID，建议从小程序后台获取
const APPID = cloud.getWXContext().APPID;
// 微信小程序 AppSecret，已从环境变量获取
const SECRET = process.env.WECHAT_APP_SECRET;

const USERS_COLLECTION = 'users';

/**
 * 通过 code 换取 session_key 和 openid，并更新或创建用户记录
 * @param {string} code - wx.login() 获取的登录凭证
 */
async function code2Session(code) {
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${SECRET}&js_code=${code}&grant_type=authorization_code`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.errcode) {
            reject(new Error(`jscode2session failed: ${result.errmsg}`));
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(new Error(`Failed to parse jscode2session response: ${data}`));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`HTTP request to jscode2session failed: ${err.message}`));
    });
  });
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!event.code) {
    // 兼容旧的调用方式，如果前端没传 code，则只返回 openid
    return { code: 200, message: '操作成功', data: { openid } };
  }

  try {
    // 使用 code 换取 session_key 和 openid
    const sessionData = await code2Session(event.code);
    const { session_key, openid: newOpenid } = sessionData;

    if (!newOpenid) {
      throw new Error('从微信服务器获取 openid 失败');
    }

    // 检查用户是否存在
    const userRecord = await db.collection(USERS_COLLECTION).where({ openid: newOpenid }).get();

    if (userRecord.data.length > 0) {
      // 用户存在，更新 session_key
      await db.collection(USERS_COLLECTION).doc(userRecord.data[0]._id).update({
        data: {
          session_key: session_key,
          updated_at: db.serverDate(),
        },
      });
    } else {
      // 用户不存在，创建新用户
      await db.collection(USERS_COLLECTION).add({
        data: {
          openid: newOpenid,
          session_key: session_key,
          created_at: db.serverDate(),
          updated_at: db.serverDate(),
        },
      });
    }

    return { code: 200, message: '登录成功', data: { openid: newOpenid } };

  } catch (error) {
    console.error('登录或更新用户失败:', error);
    return { code: 500, message: error.message || '服务器内部错误', data: {} };
  }
};