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
      10: 'pending', '10': 'pending', 'pending': 'pending',
      20: 'paid', '20': 'paid', 'paid': 'paid',
      30: 'shipped', '30': 'shipped', 'shipped': 'shipped',
      40: 'delivering', '40': 'delivering', 'delivering': 'delivering',
      50: 'delivered', '50': 'delivered', 'delivered': 'delivered',
      60: 'completed', '60': 'completed', 'completed': 'completed',
      70: 'cancelled', '70': 'cancelled', 'cancelled': 'cancelled',
      80: 'refunding', '80': 'refunding', 'refunding': 'refunding',
      90: 'refunded', '90': 'refunded', 'refunded': 'refunded'
    };
    
    // 构建订单详情
    const statusKey = order.status !== undefined ? String(order.status) : '';
    
    const orderDetail = {
      order_id: order.order_id,
      openid: order.openid,
      status: statusMap[statusKey] || 'unknown',
      pay_status: order.pay_status || '0',
      total_price: order.totalPrice || 0,
      create_time: order.createTime,
      out_trade_no: order.out_trade_no || order.outTradeNo || '',
      transaction_id: order.transaction_id || order.transactionId || '',
      payment_time: order.paymentTime || order.success_time || null,
      paymentTime: order.paymentTime ? new Date(order.paymentTime).getTime() : (order.success_time ? new Date(order.success_time).getTime() : null),
      user_info: order.userInfo || {},
      userInfo: Array.isArray(order.userInfo) ? order.userInfo : (order.userInfo ? [order.userInfo] : []),
      nickName: order.nickName || order.nickname || '',
      avatarUrl: order.avatarUrl || order.avatar || '',
      consignee: order.consignee || order.address?.name || '',
      address: Array.isArray(order.address) ? order.address : (order.address ? [order.address] : []),
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