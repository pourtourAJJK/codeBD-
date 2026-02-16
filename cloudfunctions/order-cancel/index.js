const cloud = require('wx-server-sdk');
const { withResponse } = require('../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const ORDER_COLLECTION = 'shop_order';
const ORDER_ITEMS_COLLECTION = 'orderItems';
const PRODUCT_COLLECTION = 'shop_spu';
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
      .where({ order_id: orderId, openid, status: 'pending' })
      .limit(1)
      .get();

    if (!orderRes.data || orderRes.data.length === 0) {
      return { code: 500, message: '订单不存在或无法取消', data: {} };
    }

    const order = orderRes.data[0];

    const itemsRes = await db.collection(ORDER_ITEMS_COLLECTION)
      .where({ order_id: orderId, openid })
      .get();
    const items = itemsRes.data && itemsRes.data.length > 0
      ? itemsRes.data
      : (Array.isArray(order.goods) ? order.goods : []);

    const transaction = await db.startTransaction();
    try {
      await transaction.collection(ORDER_COLLECTION).doc(order._id).update({
        data: {
          status: 'cancelled',
          cancelTime: db.serverDate(),
          updatedAt: db.serverDate()
        }
      });

      if (items.length > 0) {
        await Promise.all(items.map(item =>
          transaction.collection(PRODUCT_COLLECTION).doc(item.product_id).update({
            data: {
              lockedStock: _.inc(-Number(item.quantity || 0)),
              updatedAt: db.serverDate()
            }
          })
        ));
      }

      await transaction.commit();

      return { code: 200, message: '订单已取消', data: { orderId } };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('取消订单失败', error);
    return { code: 500, message: '取消订单失败', data: {} };
  }
};

exports.main = withResponse(handler);
