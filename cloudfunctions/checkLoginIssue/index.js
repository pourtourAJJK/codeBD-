// 云函数入口文件
const cloud = require('wx-server-sdk');

const { withResponse } = require('../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

// 云函数入口函数
const handler = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { userInfo } = event;

  try {
    console.log('登录验证流程开始执行');
    console.log('微信上下单', wxContext);

    // 查找用户
    const userResult = await db.collection('shop_user')
      .where({ openid: wxContext.OPENID })
      .get();

    if (userResult.data && userResult.data.length > 0) {
      const existingUser = userResult.data[0];
      console.log('用户已存在', existingUser._id);
      
      const updateData = {
        lastLogin: db.serverDate(),
        updated_at: db.serverDate()
      };

      // 如果有用户信息，更新用户信息
      if (userInfo) {
        updateData.nickName = userInfo.nickName;
        updateData.avatarUrl = userInfo.avatarUrl;
        if (userInfo.gender) {
          updateData.gender = userInfo.gender;
        }
      }

      await db.collection('shop_user').doc(existingUser._id).update({
        data: updateData
      });

      const userResponse = {
        _id: existingUser._id,
        nickName: existingUser.nickName || userInfo?.nickName || '用户',
        avatarUrl: existingUser.avatarUrl || userInfo?.avatarUrl || '',
        gender: existingUser.gender || userInfo?.gender || 0,
        phone: existingUser.phone || '',
        points: existingUser.points || 0,
        isMember: existingUser.isMember || false,
        memberLevel: existingUser.memberLevel || 'bronze'
      };

      return {
        code: 0,
        message: '登录验证成功',
        data: { user: userResponse }
      };
    } else {
      const newUser = {
        openid: wxContext.OPENID,
        nickName: userInfo?.nickName || '新用户',
        avatarUrl: userInfo?.avatarUrl || '',
        gender: userInfo?.gender || 0,
        phone: '',
        points: 0,
        isMember: false,
        memberLevel: 'bronze',
        createdAt: db.serverDate(),
        lastLogin: db.serverDate(),
        updated_at: db.serverDate()
      };

      const result = await db.collection('shop_user').add({
        data: newUser
      });

      const newUserResponse = {
        _id: result._id,
        nickName: newUser.nickName,
        avatarUrl: newUser.avatarUrl,
        gender: newUser.gender,
        phone: newUser.phone,
        points: newUser.points,
        isMember: newUser.isMember,
        memberLevel: newUser.memberLevel
      };

      return {
        code: 0,
        message: '新用户注册并验证成功',
        data: { user: newUserResponse }
      };
    }
  } catch (error) {
    console.error('登录验证失败:', error);
    return {
      code: -1,
      message: '登录验证失败',
      error: error.message
    };
  }
};

exports.main = withResponse(handler);
