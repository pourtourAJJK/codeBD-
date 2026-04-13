const cloud = require('wx-server-sdk');
const bcrypt = require('bcryptjs');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// ====================== 你的专属配置 ======================
const TOKEN_EXPIRE_DAY = 7;    // 7日免登录
const MAX_LOGIN_FAIL = 5;      // 单账号输错5次锁定
const LOCK_MINUTES = 15;       // 锁定15分钟（只锁当前账号）
// ==========================================================

const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers };

  try {
    const { action, account, password, token } = event;
    switch (action) {
      case 'login': return await handleLogin(account, password, headers);
      case 'verify': return await handleVerify(token, headers);
      default: return { statusCode: 400, headers, body: JSON.stringify({ code: 400 }) };
    }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ code: 500 }) };
  }
};

// 🔥 核心：全自动加密密码登录 + 密码错误次数提示
async function handleLogin(account, password, headers) {
  if (!account || !password) return { statusCode: 400, headers, body: JSON.stringify({ code: 400, message: "不能为空" }) };

  // 查询账号
  const { data } = await db.collection('admin_user').where({ account }).get();
  if (!data.length) return { statusCode: 401, headers, body: JSON.stringify({ code: 401, message: "账号不存在" }) };

  const user = data[0];
  // 单账号独立锁定（A锁不影响B）
  const lockUntil = user.lock_until || 0;
  if (lockUntil > Date.now()) return { statusCode: 403, headers, body: JSON.stringify({ code: 403, message: "本账号已锁定15分钟" }) };
  if (!user.is_enable) return { statusCode: 403, headers, body: JSON.stringify({ code: 403, message: "账号已禁用" }) };

  let isPasswordOk = false;
  // ====================== 全自动加密逻辑 ======================
  const storedPwd = user.password;
  // 判断是否是bcrypt加密串（自动识别）
  const isBcrypt = storedPwd?.startsWith('$2a$') || storedPwd?.startsWith('$2b$');

  if (isBcrypt) {
    // 已加密：正常校验
    isPasswordOk = await bcrypt.compare(password, storedPwd);
  } else {
    // 未加密：校验成功后 → 自动加密 → 自动存入数据库
    isPasswordOk = storedPwd === password;
    if (isPasswordOk) {
      const encryptedPwd = await bcrypt.hash(password, 10);
      await db.collection('admin_user').doc(user._id).update({
        data: { password: encryptedPwd }
      });
      console.log("✅ 云函数自动完成密码加密");
    }
  }

  // 密码错误：累计次数 + 返回剩余机会（合并完成）
  if (!isPasswordOk) {
    const failCount = (user.login_fail_count || 0) + 1;
    const remaining = MAX_LOGIN_FAIL - failCount; // 剩余次数

    await db.collection('admin_user').doc(user._id).update({
      data: {
        login_fail_count: failCount,
        lock_until: failCount >= MAX_LOGIN_FAIL ? Date.now() + LOCK_MINUTES*60*1000 : null
      }
    });

    // 返回剩余次数给前端
    if(remaining > 0){
      return { statusCode: 401, headers, body: JSON.stringify({ 
        code: 401, 
        message: `密码错误，还剩 ${remaining} 次机会`,
        remaining: remaining
      }) };
    } else {
      return { statusCode: 403, headers, body: JSON.stringify({ 
        code: 403, 
        message: "输错次数过多，本账号已锁定15分钟"
      }) };
    }
  }

  // 登录成功：生成7天有效期Token
  const token = `${user._id}_${Date.now()}_${Math.random().toString(36)}`;
  const expireTime = Date.now() + TOKEN_EXPIRE_DAY * 24 * 60 * 60 * 1000;

  await db.collection('admin_user').doc(user._id).update({
    data: {
      token, token_expire: new Date(expireTime),
      login_fail_count: 0, lock_until: null,
      last_login: db.serverDate()
    }
  });

  // ✅【核心修改】返回token + 完整用户信息，前端可直接读取account
  return { 
    statusCode: 200, 
    headers, 
    body: JSON.stringify({ 
      code:200, 
      message:"登录成功", 
      data:{ 
        token,
        user: user // 🔥 新增：返回用户信息
      } 
    }) 
  };
}

// Token校验（7日免登录核心）
async function handleVerify(token, headers) {
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ code:401 }) };
  const uid = token.split('_')[0];
  const { data } = await db.collection('admin_user').doc(uid).get();
  
  if (!data || data.token !== token || new Date(data.token_expire) < new Date()) {
    return { statusCode: 401, headers, body: JSON.stringify({ code:401 }) };
  }
  // ✅【补充修改】校验成功时返回用户信息，保持数据一致
  return { 
    statusCode: 200, 
    headers, 
    body: JSON.stringify({ 
      code:200,
      user: data // 🔥 新增：返回用户信息
    }) 
  };
}

exports.main = handler;