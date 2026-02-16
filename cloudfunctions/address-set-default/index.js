const cloud = require('wx-server-sdk');
const { withResponse } = require('../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const COLLECTION = 'shop_address';
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

    const { addressId } = event;
    if (!addressId) {
      return { code: 500, message: '缺少地址ID参数', data: {} };
    }

    const transaction = await db.startTransaction();
    try {
      const addressRes = await transaction.collection(COLLECTION)
        .where({ _id: addressId, openid })
        .get();

      if (!addressRes.data || addressRes.data.length === 0) {
        await transaction.rollback();
        return { code: 500, message: '地址不存在', data: {} };
      }

      await transaction.collection(COLLECTION)
        .where({ openid, isDefault: true })
        .update({ data: { isDefault: false } });

      await transaction.collection(COLLECTION)
        .where({ _id: addressId, openid })
        .update({ data: { isDefault: true, updatedAt: db.serverDate() } });

      await transaction.commit();

      return {
        code: 200,
        message: '设置默认地址成功',
        data: { addressId }
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('设置默认地址失败', error);
    return { code: 500, message: '设置默认地址失败', data: {} };
  }
};

exports.main = withResponse(handler);
