// 管理员订单详情云函数（只用 statusmax 管理订单状态）
const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库实例
const db = cloud.database();

/**
 * 管理员查询订单详情
 * @param {Object} event - 事件参数
 * @param {string} event.order_id - 订单ID
 * @returns {Object} - 订单详情结果
 */
const handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if(event.httpMethod === "OPTIONS") return { statusCode:204, headers };
  try {
    const { order_id } = event;
    
    // 参数验证
    if (!order_id) {
      return { 
        statusCode:400, 
        headers, 
        body:JSON.stringify({
          code: 400,
          message: '订单ID不能为空',
          data: null
        })
      };
    }
    
    // 查询订单基本信息
    const orderRes = await db.collection('shop_order')
      .where({ order_id })
      .limit(1)
      .get();
    
    if (orderRes.data.length === 0) {
      return { 
        statusCode:404, 
        headers, 
        body:JSON.stringify({
          code: 404,
          message: '订单不存在',
          data: null
        })
      };
    }
    
    const order = orderRes.data[0];

    // 只用 statusmax 管理状态
    const statusmax = order.statusmax || "1";
    const deliveryTime = order.delivery_time || null;
    const localGoods = order.goods || [];

    // 查询订单商品（表不存在也不崩溃）
    let orderItemsRes = { data: [] };
    try {
      orderItemsRes = await db.collection('orderItems')
        .where({ order_id })
        .get();
    } catch (e) {}

    // 状态映射表（只用 statusmax）
    const statusMap = {
      "1": { text: "待支付", color: "#ff9800" },
      "2": { text: "待发货", color: "#2196f3" },
      "3": { text: "待配送", color: "#9c27b0" },
      "4": { text: "配送中", color: "#673ab7" },
      "5": { text: "已完成", color: "#4caf50" },
      "6": { text: "已取消", color: "#f44336" },
      "80": { text: "退货中", color: "#ff5722" },
      "90": { text: "已退款", color: "#795548" }
    };
    
    const statusInfo = statusMap[statusmax] || { text: "未知", color: "#999" };
    
    // 构建订单详情（删除 delivery_status，只用 statusmax）
    const orderDetail = {
      // 基础字段
      order_id: order.order_id,
      openid: order.openid,
      statusmax: statusmax,
      statusText: statusInfo.text,
      statusColor: statusInfo.color,
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
      consignee: order.consignee || order.address?.[0]?.name || '',
      address: Array.isArray(order.address) ? order.address : (order.address ? [order.address] : []),
      logs: [],

      // 关键字段（只用 statusmax）
      delivery_time: deliveryTime,
      goods: localGoods,
      totalPrice: order.totalPrice,
      paymentAmount: order.paymentAmount,
      remark: order.remark || '',

      // 商品列表
      items: localGoods.length > 0 ? localGoods : orderItemsRes.data.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        total_price: item.quantity * item.price,
        name: item.name || ''
      })),
    };
    
    // 查询订单日志
    try {
      const logsRes = await db.collection('orderLogs')
        .where({ orderId: order_id })
        .orderBy('createTime', 'desc')
        .get();
      
      if (logsRes.data.length > 0) {
        orderDetail.logs = logsRes.data.map(log => ({
          before_status: log.beforeStatus || '',
          after_status: log.afterStatus || '',
          operator: log.operatorName || '',
          remark: log.remark || '',
          create_time: log.createTime
        }));
      }
    } catch (e) {}
    
    return {
      statusCode:200, 
      headers, 
      body:JSON.stringify({
        code: 200,
        message: '获取订单详情成功',
        data: orderDetail
      })
    };
  } catch (error) {
    console.error('获取订单详情失败:', error);
    return { 
      statusCode:500, 
      headers, 
      body:JSON.stringify({
        code: 500,
        message: '获取订单详情失败，请稍后重试',
        data: null
      })
    };
  }
};

exports.main = handler;
