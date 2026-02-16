// 获取后台管理统计数据云函数
const cloud = require('wx-server-sdk');

const { withResponse } = require('../utils/response');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库实例
const db = cloud.database();
const _ = db.command;

// 检查并创建必要的集合
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

/**
 * 获取后台管理统计数据
 * @param {Object} event - 事件参数
 * @returns {Object} - 统计数据结果
 */
const handler = async (event, context) => {
  try {
    // 确保所有需要的集合存在
    await Promise.all([
      ensureCollectionExists('shop_order'),
      ensureCollectionExists('userSessions'),
      ensureCollectionExists('orderItems'),
      ensureCollectionExists('shop_spu')
    ]);
    
    // 获取当前时间
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    // 1. 统计今日订单数量
    const todayOrdersRes = await db.collection('shop_order').where({
      createTime: _.gte(todayStart).and(_.lt(todayEnd))
    }).count();
    const todayOrders = todayOrdersRes.total;
    
    // 2. 统计今日销售总额
    const todaySalesRes = await db.collection('shop_order').where({
      createTime: _.gte(todayStart).and(_.lt(todayEnd)),
      status: _.gte(20) // 已支付及以上状态
    }).field({
      totalPrice: true
    }).get();
    const todaySales = todaySalesRes.data.reduce((sum, order) => sum + order.totalPrice, 0);
    
    // 3. 统计在线用户数（实际项目应使用实时数据库统计）
    const onlineUsersRes = await db.collection('userSessions').where({
      lastActiveTime: _.gte(new Date(now.getTime() - 30 * 60 * 1000)) // 最近10分钟活跃
    }).count();
    const onlineUsers = onlineUsersRes.total;
    
    // 4. 统计待处理订单
    const pendingOrdersRes = await db.collection('shop_order').where({
      status: _.eq(10) // 待付款
    }).count();
    const pendingOrders = pendingOrdersRes.total;
    
    // 5. 获取近7天销售趋势
    const salesTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(todayStart);
      date.setDate(date.getDate() - i);
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dateEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      // 统计当日订单数
      const dayOrdersRes = await db.collection('shop_order').where({
        createTime: _.gte(dateStart).and(_.lt(dateEnd))
      }).count();
      
      // 统计当日销售总额
      const daySalesRes = await db.collection('shop_order').where({
        createTime: _.gte(dateStart).and(_.lt(dateEnd)),
        status: _.gte(20) // 已支付及以上状态
      }).field({
        totalPrice: true
      }).get();
      
      salesTrend.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        orders: dayOrdersRes.total,
        sales: daySalesRes.data.reduce((sum, order) => sum + order.totalPrice, 0)
      });
    }
    
    // 6. 获取热门商品列表
    const hotProductsRes = await db.collection('orderItems').aggregate()
      .group({
        _id: '$product_id',
        totalQuantity: _.sum('$quantity')
      })
      .sort({
        totalQuantity: -1
      })
      .limit(10)
      .lookup({
        from: 'shop_spu',
        localField: '_id',
        foreignField: '_id',
        as: 'productInfo'
      })
      .end();
    
    const hotProducts = hotProductsRes.list.map(item => {
      const product = item.productInfo[0] || {};
      return {
        product_id: item._id,
        name: product.name || '未知商品',
        image: product.cover_image || '',
        totalSales: item.totalQuantity
      };
    });
    
    // 7. 获取最新订单列表
    const latestOrdersRes = await db.collection('shop_order')
      .orderBy('createTime', 'desc')
      .limit(10)
      .get();
    
    const latestOrders = latestOrdersRes.data.map(order => ({
      order_id: order.order_id,
      orderNo: order.orderNo,
      createTime: order.createTime,
      totalPrice: order.totalPrice,
      status: order.status,
      statusText: getOrderStatusText(order.status),
      userName: order.userInfo && order.userInfo.nickName || '未知用户',
      phone: order.userInfo && order.userInfo.phone || ''
    }));
    
    // 构建返回结果
    const result = {
      code: 200,
      message: '获取统计数据成功',
      data: {
        // 概览统计卡片
        statistics: {
          todayOrders,
          todaySales,
          onlineUsers,
          pendingOrders
        },
        // 销售趋势图
        salesTrend,
        // 热门商品列表
        hotProducts,
        // 最新订单列表
        latestOrders
      }
    };
    
    return result;
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return {
      code: 500,
      message: '获取统计数据失败，请稍后重试',
      data: null
    };
  }
};

/**
 * 获取订单状态文本
 * @param {number} status - 订单状态码
 * @returns {string} - 订单状态文本
 */
function getOrderStatusText(status) {
  const statusMap = {
    10: '待付款',
    20: '已付款',
    30: '待配送',
    40: '配送中',
    50: '已送达',
    60: '已完成',
    70: '已取消',
  };
  return statusMap[status] || '未知状态';
}

exports.main = withResponse(handler);