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

    const { goods, items, address, userInfo, totalPrice, couponId, remark } = event;
    const rawItems = Array.isArray(goods) ? goods.flat() : (Array.isArray(items) ? items.flat() : []);

    if (!rawItems || rawItems.length === 0) {
      return { code: 500, message: '请至少选择一个商品', data: {} };
    }

    if (!address || !address.name || !address.phone || !address.detail) {
      return { code: 500, message: '请选择有效的收货地址', data: {} };
    }

    const normalizedItems = rawItems.map(item => ({
      ...item,
      product_id: item.product_id || item.productId || item.id
    }));

    const productIds = normalizedItems.map(item => item.product_id).filter(Boolean);
    if (productIds.length === 0) {
      return { code: 500, message: '商品参数不完整', data: {} };
    }

    const productRes = await db.collection(PRODUCT_COLLECTION)
      .where({ _id: _.in(productIds) })
      .get();
    const productMap = (productRes.data || []).reduce((map, product) => {
      map[product._id] = product;
      return map;
    }, {});

    for (const item of normalizedItems) {
      const product = productMap[item.product_id];
      if (!product) {
        return { code: 500, message: `商品${item.product_id}不存在`, data: {} };
      }
      const quantity = Number(item.quantity) || 0;
      if (quantity <= 0) {
        return { code: 500, message: '商品数量不合法', data: {} };
      }
      const available = Number(product.stock || 0) - Number(product.lockedStock || 0);
      if (available < quantity) {
        return { code: 500, message: `商品${product.name || product._id}库存不足`, data: {} };
      }
    }

    const orderNo = `D${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const orderItems = normalizedItems.map(item => {
      const product = productMap[item.product_id] || {};
      return {
        order_id: orderNo,
        product_id: item.product_id,
        quantity: Number(item.quantity) || 1,
        openid,
        product_name: product.name || item.product_name || item.name || '商品名称',
        price: Number(product.price || item.price || 0),
        spec: product.spec || item.spec || '',
        cover_image: product.cover_image || item.cover_image || '',
        createdAt: db.serverDate()
      };
    });

    const orderData = {
      order_id: orderNo,
      orderNo,
      openid,
      userInfo: userInfo || {},
      address,
      addressId: address._id || '',
      totalPrice: Number(totalPrice || 0),
      paidAmount: 0,
      couponId: couponId || '',
      status: 'pending',
      pay_status: 0,
      out_trade_no: '',
      transaction_id: '',
      success_time: '',
      remark: remark || '',
      goods: orderItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        product_name: item.product_name,
        price: item.price,
        spec: item.spec,
        cover_image: item.cover_image
      })),
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
      createTime: db.serverDate()
    };

    const transaction = await db.startTransaction();
    try {
      await Promise.all(normalizedItems.map(item =>
        transaction.collection(PRODUCT_COLLECTION)
          .doc(item.product_id)
          .update({ data: { lockedStock: _.inc(Number(item.quantity) || 0), updatedAt: db.serverDate() } })
      ));

      const orderResult = await transaction.collection(ORDER_COLLECTION).add({ data: orderData });
      if (!orderResult._id) throw new Error('订单写入失败');

      if (orderItems.length > 0) {
        await Promise.all(orderItems.map(item =>
          transaction.collection(ORDER_ITEMS_COLLECTION).add({ data: item })
        ));
      }

      await transaction.commit();

      return {
        code: 200,
        message: '订单创建成功',
        data: {
          order_id: orderNo,
          orderNo
        }
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('订单创建失败', error);
    return { code: 500, message: '订单创建失败', data: {} };
  }
};

exports.main = withResponse(handler);
