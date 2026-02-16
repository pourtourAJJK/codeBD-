const cloud = require('wx-server-sdk');
const { withResponse } = require('../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const ALLOW_FIELDS = [
  'nickname',
  'avatarUrl',
  'gender',
  'birthday',
  'region',
  'province',
  'city',
  'district',
  'phoneNumber'
];

/**
 * 更新用户信息云函数
 * 统一集合：shop_user，统一字段：openid
 */
const handler = async (event = {}) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = event.openid || wxContext.OPENID;

    if (!openid) {
      return { code: 401, message: '未登录', data: {} };
    }

    const input = { ...event };
    if (input.nickName && !input.nickname) input.nickname = input.nickName;
    if (input.phone && !input.phoneNumber) input.phoneNumber = input.phone;

    const updateData = {};
    ALLOW_FIELDS.forEach((key) => {
      if (input[key] !== undefined && input[key] !== null && input[key] !== '') {
        updateData[key] = input[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return { code: 500, message: '无可更新字段', data: {} };
    }

    updateData.updateTime = db.serverDate();

    const userRes = await db.collection('shop_user').where({ openid }).get();

    let userInfo = {};
    if (userRes.data.length > 0) {
      const docId = userRes.data[0]._id;
      await db.collection('shop_user').doc(docId).update({ data: updateData });
      userInfo = { ...userRes.data[0], ...updateData };
    } else {
      const newUser = {
        openid,
        ...updateData,
        createTime: db.serverDate()
      };
      const addRes = await db.collection('shop_user').add({ data: newUser });
      userInfo = { ...newUser, _id: addRes._id };
    }

    return {
      code: 200,
      message: '保存成功',
      data: { userInfo }
    };
  } catch (error) {
    console.error('更新用户信息云函数错误', error);
    return {
      code: 500,
      message: error.message || '保存失败',
      data: {}
    };
  }
};

exports.main = withResponse(handler);
