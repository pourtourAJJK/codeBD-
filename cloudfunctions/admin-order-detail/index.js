// 管理员订单详情云函数
const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库实例
const db = cloud.database();
const _ = db.command;

/**
 * 管理员查询订单详情
 * @param {Object} event - 事件参数
 * @param {string} event.order_id - 订单ID
 * @returns {Object} - 订单详情结果
 */
const handler = async (event, context) => {
  try {
    const { order_id } = event;
    
    // 参数验证
    if (!order_id) {
      return {
        code: 400,
        message: '订单ID不能为空',
        data: null
      };
    }
    
    // 查询订单基本信息
    const orderRes = await db.collection('shop_order')
      .where({ order_id })
      .limit(1)
      .get();
    
    if (orderRes.data.length === 0) {
      return {
        code: 404,
        message: '订单不存在',
        data: null
      };
    }
    
    const order = orderRes.data[0];
    
    // 查询订单商品
    const orderItemsRes = await db.collection('orderItems')
      .where({ order_id })
      .get();
    
    // 转换状态为英文
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
    
    // 构建订单详情
    const orderDetail = {
      order_id: order.order_id,
      openid: order.openid,
      status: statusMap[order.status] || 'unknown',
      pay_status: order.pay_status || 'unpaid',
      total_price: order.totalPrice || 0,
      create_time: order.createTime,
      out_trade_no: order.outTradeNo || '',
      transaction_id: order.transactionId || '',
      payment_time: order.paymentTime || null,
      user_info: order.userInfo || {},
      address: order.address || {},
      items: orderItemsRes.data.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        total_price: item.quantity * item.price
      })),
      logs: []
    };
    
    // 查询订单日志
    const logsRes = await db.collection('orderLogs')
      .where({ orderId: order_id })
      .orderBy('createTime', 'desc')
      .get();
    
    if (logsRes.data.length > 0) {
      orderDetail.logs = logsRes.data.map(log => ({
        before_status: statusMap[log.beforeStatus] || 'unknown',
        after_status: statusMap[log.afterStatus] || 'unknown',
        operator: log.operatorName || '',
        remark: log.remark || '',
        create_time: log.createTime
      }));
    }
    
    return {
      code: 200,
      message: '获取订单详情成功',
      data: orderDetail
    };
  } catch (error) {
    console.error('获取订单详情失败:', error);
    return {
      code: 500,
      message: '获取订单详情失败，请稍后重试',
      data: null
    };
  }
};

exports.main = handler;