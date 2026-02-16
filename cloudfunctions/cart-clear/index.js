const cloud = require('wx-server-sdk');
const { withResponse } = require('../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const CART_COLLECTION = 'cart';
const USER_COLLECTION = 'shop_user';

async function ensureUserExists(openid) {
  const userRes = await db.collection(USER_COLLECTION).where({ openid }).get();
  return userRes.data.length > 0;
}

const handler = async (event = {}) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return { code: 401, message: '未登录', data: {} };
    }

    const userExists = await ensureUserExists(openid);
    if (!userExists) {
      return { code: 500, message: '用户不存在', data: {} };
    }

    const { type = 'all', itemIds = [] } = event;

    if (type === 'all') {
      const res = await db.collection(CART_COLLECTION)
        .where({ openid, isDeleted: _.neq(true) })
        .update({ data: { isDeleted: true, updatedAt: db.serverDate() } });

      return {
        code: 200,
        message: '清空购物车成功',
        data: { deletedCount: res.stats.updated || 0, type }
      };
    }

    if (type === 'selected' && Array.isArray(itemIds) && itemIds.length > 0) {
      const res = await db.collection(CART_COLLECTION)
        .where({ _id: _.in(itemIds), openid, isDeleted: _.neq(true) })
        .update({ data: { isDeleted: true, updatedAt: db.serverDate() } });

      return {
        code: 200,
        message: '清空购物车成功',
        data: { deletedCount: res.stats.updated || 0, type }
      };
    }

    return { code: 500, message: '无效的清空参数', data: {} };
  } catch (error) {
    console.error('清空购物车失败', error);
    return { code: 500, message: '清空购物车失败', data: {} };
  }
};

exports.main = withResponse(handler);
