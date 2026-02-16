const cloud = require('wx-server-sdk');
const { withResponse } = require('../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const ORDER_COLLECTION = 'shop_order';
const USER_COLLECTION = 'shop_user';
const ALLOWED_STATUS = ['pending', 'paid', 'shipped', 'completed', 'cancelled', 'payment_fail'];

const handler = async (event = {}) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return { code: 401, message: '未登录', data: {} };
    }

    const userRes = await db.collection(USER_COLLECTION).where({ openid }).get();
    if (!userRes.data || userRes.data.length === 0) {
      return { code: 500, message: '用户不存在', data: {} };
    }

    const { status } = event;
    const orderId = event.order_id || event.orderId;
    if (!orderId || !status) {
      return { code: 500, message: '缺少必要参数', data: {} };
    }

    if (!ALLOWED_STATUS.includes(status)) {
      return { code: 500, message: '订单状态不合法', data: {} };
    }

    const updateRes = await db.collection(ORDER_COLLECTION)
      .where({ order_id: orderId, openid })
      .update({ data: { status, updatedAt: db.serverDate() } });

    if (!updateRes.stats || updateRes.stats.updated === 0) {
      return { code: 500, message: '订单不存在或无权限', data: {} };
    }

    return {
      code: 200,
      message: '更新订单状态成功',
      data: { orderId, status }
    };
  } catch (error) {
    console.error('更新订单状态失败', error);
    return { code: 500, message: '更新订单状态失败', data: {} };
  }
};

exports.main = withResponse(handler);
