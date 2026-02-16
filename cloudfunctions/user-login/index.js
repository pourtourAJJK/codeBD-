const cloud = require('wx-server-sdk');
const { withResponse } = require('./response.js');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const openDataUtil = require('./openDataUtil.js');

/**
 * 用户登录云函数
 * 兼容wx.weixinAppLogin（多端应用）和wx.login（纯小程序）两种获取code的方式
 */
const handler = async (event, context) => {
  try {
    console.log('登录云函数调用参数', event);
    
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    if (!openid) {
      return {
        code: -1,
        message: '获取openid失败',
        data: null
      };
    }
    
    // 提取前端传递的用户信息
    const { nickname, avatarUrl, gender, birthday, region, phoneNumber } = event;
    
    // 检查用户是否已存在
    const userRes = await db.collection('shop_user').where({ openid }).get();
    
    let userInfo = {};
    if (userRes.data.length > 0) {
      // 用户已存在，更新用户信息
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
      
      await db.collection('shop_user').doc(userRes.data[0]._id).update({ 
        data: updateData 
      });
      
      // 返回更新后的用户信息
      userInfo = { ...userRes.data[0], ...updateData };
    } else {
      // 用户不存在，创建新用户
      const newUserInfo = {
        openid,
        nickname: nickname || '用户' + openid.substring(0, 6),
        avatarUrl: avatarUrl || '',
        gender: gender !== undefined ? gender : 0,
        phoneNumber: phoneNumber || '',
        birthday: birthday || '',
        region: region || '',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      };
      
      const addRes = await db.collection('shop_user').add({ data: newUserInfo });
      userInfo = { ...newUserInfo, _id: addRes._id };
    }
    
    // 生成安全的token
    const token = openDataUtil.generateToken(openid);
    
    return {
      code: 0,
      message: '登录成功',
      data: {
        userInfo,
        token,
        openid
      }
    };
    
  } catch (error) {
    console.error('登录云函数错误', error);
    return {
      code: -1,
      message: error.message,
      data: null
    };
  }
};

exports.main = withResponse(handler);
