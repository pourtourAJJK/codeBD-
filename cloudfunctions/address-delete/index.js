const cloud = require('wx-server-sdk');
const { withResponse } = require('./response');

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

    const removeRes = await db.collection(COLLECTION).where({ _id: addressId, openid }).remove();

    if (!removeRes.stats || removeRes.stats.removed === 0) {
      return { code: 500, message: '地址不存在或不属于该用户', data: {} };
    }

    return {
      code: 200,
      message: '删除地址成功',
      data: { addressId }
    };
  } catch (error) {
    console.error('删除地址失败', error);
    return { code: 500, message: '删除地址失败', data: {} };
  }
};

exports.main = withResponse(handler);
