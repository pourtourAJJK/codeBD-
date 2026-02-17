const cloud = require('wx-server-sdk');
const { withResponse } = require('./response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const ORDER_COLLECTION = 'shop_order';
const ORDER_ITEMS_COLLECTION = 'orderItems';
const PRODUCT_COLLECTION = 'shop_spu';
const ADDRESS_COLLECTION = 'shop_address';
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
      .where({ order_id: orderId, openid })
      .limit(1)
      .get();

    if (!orderRes.data || orderRes.data.length === 0) {
      return { code: 500, message: '订单不存在或无权限', data: {} };
    }


    const order = orderRes.data[0];

    const orderItemsRes = await db.collection(ORDER_ITEMS_COLLECTION)
      .where({ order_id: orderId, openid })
      .get();
    const orderItems = orderItemsRes.data || [];

    const productIds = [...new Set(orderItems.map(item => item.product_id).filter(Boolean))];
    const productMap = new Map();
    if (productIds.length > 0) {
      const productRes = await db.collection(PRODUCT_COLLECTION)
        .where({ _id: _.in(productIds) })
        .get();
      (productRes.data || []).forEach(product => {
        productMap.set(product._id, product);
      });
    }

    const goods = orderItems.map(item => {
      const product = productMap.get(item.product_id) || {};
      return {
        ...item,
        productInfo: {
          name: product.name || item.product_name || '商品名称',
          price: Number(product.price || item.price || 0),
          spec: product.spec || item.spec || '',
          cover_image: product.cover_image || item.cover_image || ''
        }
      };
    });

    let address = order.address || null;
    if (order.addressId) {
      const addressRes = await db.collection(ADDRESS_COLLECTION)
        .where({ _id: order.addressId, openid })
        .get();
      if (addressRes.data && addressRes.data.length > 0) {
        address = addressRes.data[0];
      }
    }

    const formattedOrder = {
      ...order,
      goods: Array.isArray(order.goods) && order.goods.length > 0 ? order.goods : goods,
      address
    };

    return {
      code: 200,
      message: '获取订单详情成功',
      data: { order: formattedOrder }
    };
  } catch (error) {
    console.error('获取订单详情失败', error);
    return { code: 500, message: '获取订单详情失败', data: {} };
  }
};

exports.main = withResponse(handler);
