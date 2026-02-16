// 更新手机号云函数
const cloud = require('wx-server-sdk');
const { withResponse } = require('../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 检查并创建集合的辅助函数
async function ensureCollectionExists(collectionName) {
  try {
    await db.collection(collectionName).count();
    console.log(`集合 ${collectionName} 已存在`);
  } catch (error) {
    if (error.errCode === -502005 || error.message.includes('collection not exists')) {
      try {
        await db.createCollection(collectionName);
        console.log(`成功创建集合: ${collectionName}`);
      } catch (createError) {
        console.error(`创建集合 ${collectionName} 失败:`, createError);
        throw createError;
      }
    } else {
      throw error;
    }
  }
}

/**
 * 更新用户手机号云函数
 * @param {Object} event - 事件对象，包含cloudID
 */
const handler = async (event = {}) => {
  try {
    if (!event.cloudID) {
      return { code: 500, message: '缺少必要参数cloudID', data: {} };
    }

    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return { code: 401, message: '未登录', data: {} };
    }

    await ensureCollectionExists('shop_user');

    let phoneNumber = '';
    try {
      const phoneResult = await cloud.openapi.cloud.getOpenData({
        list: [{ cloudID: event.cloudID }]
      });

      phoneNumber = phoneResult?.list?.[0]?.data?.phoneNumber || '';

      const watermark = phoneResult?.list?.[0]?.data?.watermark;
      if (watermark) {
        const appid = cloud.getWXContext().APPID;
        if (watermark.appid !== appid) {
          return { code: 500, message: '手机号数据无效', data: {} };
        }
        const now = Date.now();
        const fiveMinutesAgo = now - 5 * 60 * 1000;
        if (watermark.timestamp < fiveMinutesAgo) {
          return { code: 500, message: '手机号数据已过期，请重新获取', data: {} };
        }
      }

      if (!phoneNumber) {
        return { code: 500, message: '获取手机号失败', data: {} };
      }
    } catch (error) {
      if (error.errCode === -601006) {
        return { code: 500, message: '手机号授权已过期，请重新授权', data: {} };
      }
      return { code: 500, message: '获取手机号失败，请重试', data: {} };
    }

    const userCollection = db.collection('shop_user');
    const updateResult = await userCollection.where({ openid }).update({
      data: {
        phoneNumber,
        updateTime: db.serverDate()
      }
    });

    if (updateResult.stats && updateResult.stats.updated === 0) {
      return { code: 500, message: '用户不存在', data: {} };
    }

    return {
      code: 200,
      message: '手机号绑定成功',
      data: { phoneNumber }
    };
  } catch (error) {
    console.error('更新手机号云函数执行失败:', error);
    return { code: 500, message: '手机号绑定失败，请重试', data: {} };
  }
};

exports.main = withResponse(handler);
