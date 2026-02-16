/**
 * 用户登录云函数 v2 - 零依赖版本
 * 完整实现：登录 + 自动注册一体化逻辑
 * 
 * 功能：
 * 1. 根据 openid 查询 shop_user 集合
 * 2. 如果用户不存在，自动创建新用户（自动注册）
 * 3. 如果用户已存在，返回用户信息
 * 4. 保证：只要登录成功，数据库里一定有对应用户记录
 */

const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 生成简单的token
 */
function generateToken(openid) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return Buffer.from(`${openid}_${timestamp}_${random}`).toString('base64');
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  try {
    console.log('[user-login-v2] 调用参数:', event);
    
    // 1. 获取 openid（从微信上下文中自动获取）
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    if (!openid) {
      return {
        code: -1,
        message: '获取 openid 失败,请重新登录',
        data: null
      };
    }
    
    console.log('[user-login-v2] 获取到 openid:', openid);
    
    // 2. 提取前端传递的用户信息（可选）+ session_key
    const { nickname, avatarUrl, gender, birthday, region, phoneNumber, session_key } = event;
    
    console.log('[user-login-v2] 收到 session_key:', session_key ? '是' : '否');
    
    // 3. 查询用户是否已存在（注意：shop_user 集合使用 openid 字段，不是 _openid）
    const userRes = await db.collection('shop_user').where({ openid }).get();
    
    let userInfo = {};
    let isNewUser = false;
    
    if (userRes.data.length > 0) {
      // 用户已存在，更新用户信息
      console.log('[user-login-v2] 用户已存在，更新信息');
      
      const updateData = {
        updateTime: db.serverDate()
      };
      
      // 只更新有值的字段
      if (nickname) updateData.nickname = nickname;
      if (avatarUrl) updateData.avatarUrl = avatarUrl;
      if (gender !== undefined) updateData.gender = gender;
      if (birthday) updateData.birthday = birthday;
      if (region) updateData.region = region;
      if (phoneNumber) updateData.phoneNumber = phoneNumber;
      if (session_key) updateData.session_key = session_key;  // 保存 session_key
      
      await db.collection('shop_user').doc(userRes.data[0]._id).update({ 
        data: updateData 
      });
      
      // 返回更新后的用户信息
      userInfo = { ...userRes.data[0], ...updateData };
      
    } else {
      // 用户不存在，自动创建新用户（自动注册）
      console.log('[user-login-v2] 用户不存在，自动创建新用户');
      isNewUser = true;
      
      const newUserInfo = {
        openid,
        nickname: nickname || '用户' + openid.substring(0, 6),
        avatarUrl: avatarUrl || '',
        gender: gender !== undefined ? gender : 0,
        phoneNumber: phoneNumber || '',
        birthday: birthday || '',
        region: region || '',
        session_key: session_key || '',  // 保存 session_key
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      };
      
      const addRes = await db.collection('shop_user').add({ data: newUserInfo });
      userInfo = { ...newUserInfo, _id: addRes._id };
      
      console.log('[user-login-v2] 新用户创建成功，_id:', addRes._id);
    }
    
    // 4. 生成 token
    const token = generateToken(openid);
    
    // 5. 返回成功结果
    return {
      code: 0,
      message: isNewUser ? '注册成功' : '登录成功',
      data: {
        userInfo,
        token,
        openid,
        isNewUser
      }
    };
    
  } catch (error) {
    console.error('[user-login-v2] 错误:', error);
    return {
      code: -1,
      message: error.message || '登录失败',
      data: null
    };
  }
};
