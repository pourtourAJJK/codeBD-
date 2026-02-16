// 获取订单统计云函数
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

const handler = async (event, context) => {
  try {
    // 确保订单集合存在
    await ensureCollectionExists('shop_order');

    // 获取用户信息
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    // 初始化订单统计
    const stats = {
      all: 0,
      pending: 0,
      paid: 0,
      shipped: 0,
      delivered: 0,
      completed: 0,
      cancelled: 0,
      toConsume: 0,
      toEvaluate: 0,
      refund: 0
    };

    // 查询所有订单
    const ordersResult = await db.collection('shop_order').where({
      openid: openid
    }).get();

    // 统计各状态订单数量
    const orders = ordersResult.data;
    stats.all = orders.length;

    orders.forEach(order => {
      if (order.status === 'pending') {
        stats.pending++;
      } else if (order.status === 'paid') {
        stats.paid++;
      } else if (order.status === 'shipped') {
        stats.shipped++;
      } else if (order.status === 'delivered') {
        stats.delivered++;
      } else if (order.status === 'completed') {
        stats.completed++;
      } else if (order.status === 'cancelled') {
        stats.cancelled++;
      } else if (order.status === 'toConsume') {
        stats.toConsume++;
      } else if (order.status === 'toEvaluate') {
        stats.toEvaluate++;
      } else if (order.status === 'refund') {
        stats.refund++;
      }
    });

    return {
      code: 200,
      message: '获取订单统计成功',
      data: {
        stats
      }
    };

  } catch (err) {
    console.error('获取订单统计失败', err);
    return {
      code: 500,
      message: '系统错误',
      data: { error: err.message }
    };
  }
};

exports.main = withResponse(handler);
