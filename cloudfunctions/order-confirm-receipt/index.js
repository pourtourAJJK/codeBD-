const cloud = require('wx-server-sdk');
const { withResponse } = require('../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const ORDER_COLLECTION = 'shop_order';
const USER_COLLECTION = 'shop_user';

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

    const orderId = event.order_id || event.orderId;
    if (!orderId) {
      return { code: 500, message: '缺少订单ID参数', data: {} };
    }

    const orderRes = await db.collection(ORDER_COLLECTION)
      .where({ order_id: orderId, openid, status: 'shipped' })
      .limit(1)
      .get();

    if (!orderRes.data || orderRes.data.length === 0) {
      return { code: 500, message: '订单不存在或无法确认收货', data: {} };
    }

    await db.collection(ORDER_COLLECTION).doc(orderRes.data[0]._id).update({
      data: {
        status: 'completed',
        completionTime: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });

    return { code: 200, message: '确认收货成功', data: { orderId } };
  } catch (error) {
    console.error('确认收货失败', error);
    return { code: 500, message: '确认收货失败', data: {} };
  }
};

exports.main = withResponse(handler);