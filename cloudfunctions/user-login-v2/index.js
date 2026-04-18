const cloud = require('wx-server-sdk');
const https = require('https');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 填写你的正确信息
const APPID = "wxf6ebbdde5f6b75bc";
const SECRET = "a6cf2206ed789475c1caa7c6e4bf81c0"; 

function generateToken(openid) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return Buffer.from(`${openid}_${timestamp}_${random}`).toString('base64');
}

function code2Session(code) {
  return new Promise((resolve, reject) => {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${SECRET}&js_code=${code}&grant_type=authorization_code`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

exports.main = async (event) => {
  try {
    const { code } = event;
    let session_key = "";
    let openid = event.userInfo?.openId || event.openid || cloud.getWXContext().OPENID;

    // 仅当code、密钥都正确时，才获取并保存session_key
    if (code && SECRET) {
      const wxRes = await code2Session(code);
      session_key = wxRes.session_key || "";
      console.log("session_key：", session_key);
    }

    const userRes = await db.collection('shop_user').where({ openid }).get();
    if (userRes.data.length > 0 && session_key) {
      // 🔥 关键修复：只有session_key不为空，才更新数据库
      await db.collection('shop_user').doc(userRes.data[0]._id).update({
        data: { session_key, updateTime: db.serverDate() }
      });
    }

    return {
      code: 0,
      message: "登录成功",
      data: { userInfo: { ...userRes.data[0], session_key }, token: generateToken(openid), openid }
    };
  } catch (err) {
    console.error(err);
    return { code: -1, message: "登录失败", data: null };
  }
};