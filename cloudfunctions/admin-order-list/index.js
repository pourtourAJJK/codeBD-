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
 * @param {string} event.status - 订单状态筛选（忽略，默认查询所有状态）
 * @param {number} event.pay_status - 支付状态筛选
 * @param {string} event.keyword - 订单号搜索
 * @returns {Object} - 订单列表结果
 */
const handler = async (event, context) => {
  try {
    const { page = 1, limit = 10, pay_status, keyword } = event;
    
    // 构建查询条件 - 默认查询所有状态的订单
    let query = db.collection('shop_order');
    
    // 支付状态筛选
    if (pay_status !== undefined) {
      console.log('按支付状态筛选:', pay_status);
      // 兼容字符串格式，确保查询字符串类型的 pay_status
      const payStatusValue = typeof pay_status === 'string' ? pay_status : String(pay_status);
      query = query.where({ pay_status: payStatusValue });
    }
    
    // 订单号搜索
    if (keyword) {
      console.log('按订单号搜索:', keyword);
      query = query.where({
        orderNo: _.regex({ regex: keyword, options: 'i' })
      });
    }
    
    // 计算总数
    const totalRes = await query.count();
    const total = totalRes.total;
    console.log('订单总数:', total);
    
    // 分页查询
    const ordersRes = await query
      .orderBy('createTime', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get();
    
    console.log('查询到订单数量:', ordersRes.data.length);
    
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
        orderNo: order.orderNo,
        openid: order.openid,
        status: statusMap[order.status] || 'unknown',
        pay_status: order.pay_status || '0',
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