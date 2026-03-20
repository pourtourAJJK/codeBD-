// 管理员订单列表云函数
const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库实例
const db = cloud.database();
const _ = db.command;

/**
 * 管理员查询订单列表
 * @param {Object} event - 事件参数
 * @param {number} event.page - 页码，默认1
 * @param {number} event.limit - 每页数量，默认10
 * @param {string} event.status - 订单状态筛选
 * @param {string} event.keyword - 订单号搜索
 * @returns {Object} - 订单列表结果
 */
const handler = async (event, context) => {
  try {
    const { page = 1, limit = 10, status, keyword } = event;
    
    // 构建查询条件
    let query = db.collection('shop_order');
    
    // 状态筛选
    if (status) {
      // 状态映射
      const statusMap = {
        'pending': 10,
        'paid': 20,
        'shipped': 30,
        'completed': 60,
        'cancelled': 70,
        'refunding': 80,
        'refunded': 90
      };
      const statusCode = statusMap[status];
      if (statusCode) {
        query = query.where({ status: statusCode });
      }
    }
    
    // 订单号搜索
    if (keyword) {
      query = query.where({
        orderNo: _.regex({ regex: keyword, options: 'i' })
      });
    }
    
    // 计算总数
    const totalRes = await query.count();
    const total = totalRes.total;
    
    // 分页查询
    const ordersRes = await query
      .orderBy('createTime', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get();
    
    // 转换状态为英文
    const orders = ordersRes.data.map(order => {
      const statusMap = {
        10: 'pending',
        20: 'paid',
        30: 'shipped',
        40: 'delivering',
        50: 'delivered',
        60: 'completed',
        70: 'cancelled',
        80: 'refunding',
        90: 'refunded'
      };
      
      return {
        order_id: order.order_id,
        openid: order.openid,
        status: statusMap[order.status] || 'unknown',
        pay_status: order.pay_status || 'unpaid',
        total_price: order.totalPrice || 0,
        create_time: order.createTime,
        out_trade_no: order.outTradeNo || '',
        transaction_id: order.transactionId || '',
        payment_time: order.paymentTime || null
      };
    });
    
    return {
      code: 200,
      message: '获取订单列表成功',
      data: {
        list: orders,
        total,
        page,
        limit
      }
    };
  } catch (error) {
    console.error('获取订单列表失败:', error);
    return {
      code: 500,
      message: '获取订单列表失败，请稍后重试',
      data: null
    };
  }
};

exports.main = handler;