const cloud = require('wx-server-sdk');
const { withResponse } = require('../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

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

    const { itemId, quantity, checked, action } = event;

    if (!itemId || typeof itemId !== 'string') {
      return { code: 500, message: '购物车项ID参数错误', data: {} };
    }

    const cartRes = await db.collection(CART_COLLECTION).doc(itemId).get();
    const cartItem = cartRes.data;

    if (!cartItem || cartItem.openid !== openid) {
      return { code: 500, message: '购物车项不存在或无权限', data: {} };
    }

    if (action === 'delete') {
      await db.collection(CART_COLLECTION).doc(itemId).update({
        data: { isDeleted: true, updatedAt: db.serverDate() }
      });

      return { code: 200, message: '删除成功', data: { itemId } };
    }

    if (quantity !== undefined) {
      const newQuantity = Number(quantity);
      if (!Number.isFinite(newQuantity) || newQuantity < 1) {
        return { code: 500, message: '商品数量不合法', data: {} };
      }

      await db.collection(CART_COLLECTION).doc(itemId).update({
        data: { quantity: Math.min(newQuantity, 999), updatedAt: db.serverDate() }
      });

      return { code: 200, message: '更新数量成功', data: { itemId } };
    }

    if (checked !== undefined) {
      await db.collection(CART_COLLECTION).doc(itemId).update({
        data: { checked: !!checked, updatedAt: db.serverDate() }
      });

      return { code: 200, message: '更新选中状态成功', data: { itemId } };
    }

    return { code: 500, message: '缺少有效的更新参数', data: {} };
  } catch (error) {
    console.error('更新购物车失败', error);
    return { code: 500, message: '更新购物车失败', data: {} };
  }
};

exports.main = withResponse(handler);
