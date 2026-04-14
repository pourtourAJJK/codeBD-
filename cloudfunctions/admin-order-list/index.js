const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if(event.httpMethod === "OPTIONS") return { statusCode:204, headers };
  try {
    //接收前端传的 token
    const { 
      adminToken,
      page = 1, 
      limit = 10, 
      pay_status, 
      keyword 
    } = event;

    // 没有 token → 直接返回空（权限拦截）
    if (!adminToken) {
      return {
        statusCode:200,
        headers,
        body:JSON.stringify({
          code: 401,
          message: '未登录',
          data: null
        })
      };
    }

    // 核心修复：优先获取订单ID（精准查询，最高优先级）
    const orderId = event.order_id; 
    console.log("【云函数】接收前端传递的订单ID：", orderId);

    // 有权限 → 查询数据库
    let query = db.collection('shop_order');

    // 强制过滤规则：排除未支付、已取消订单
    query = query.where({
      pay_status: _.neq('0'),
      statusmax: _.neq('6')
    });

    // 强制精准查询
    if (orderId) {
      console.log("【云函数】执行精准查询：", orderId);
      query = query.where({
        order_id: orderId
      });
    }

    // 支付状态筛选
    if (pay_status !== undefined && pay_status !== '' && pay_status !== null) {
      const payStatusValue = typeof pay_status === 'string' ? pay_status : String(pay_status);
      query = query.where({ pay_status: payStatusValue });
    }
    
    // 核心修复：支持前端逗号分隔的多状态筛选 2,3,4,5
    if (event.statusmax !== undefined && event.statusmax !== '' && event.statusmax !== null) {
      let statusValue = event.statusmax;
      // 如果是逗号分隔的字符串，转换为数组，执行 IN 查询
      if (typeof statusValue === 'string' && statusValue.includes(',')) {
        const statusArray = statusValue.split(',').map(item => item.trim());
        query = query.where({
          statusmax: _.in(statusArray)
        });
      } else {
        // 单个状态，正常筛选
        query = query.where({ statusmax: statusValue });
      }
    }
    
    // 订单号模糊搜索
    if (keyword && !orderId) {
      query = query.where({
        $or: [
          { orderNo: _.regex({ regex: keyword, options: 'i' }) },
          { order_id: _.regex({ regex: keyword, options: 'i' }) }
        ]
      });
    }
    
    // 查询总数
    const totalRes = await query.count();
    const total = totalRes.total;
    console.log("【云函数】符合条件的订单总数：", total);

    // 分页查询（按创建时间倒序）
    const ordersRes = await query
      .orderBy('createTime', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get();

    console.log("【云函数】查询到的订单数据：", ordersRes.data);

    // 数据格式化
    const orders = ordersRes.data.map(order => {
      const statusmax = order.statusmax || order.status || 0;

      return {
        order_id: order.order_id,
        orderNo: order.orderNo,
        openid: order.openid,
        statusmax: statusmax,
        pay_status: order.pay_status || '0',
        total_price: order.totalPrice || 0,
        create_time: order.createTime,
        out_trade_no: order.out_trade_no || order.outTradeNo || '',
        // 🔥 修复：修正笔误，这里是导致500的唯一原因
        transaction_id: order.transaction_id || order.transactionId || '',
        payment_time: order.paymentTime || order.success_time || null,
        paymentTime: order.paymentTime ? new Date(order.paymentTime).getTime() : (order.success_time ? new Date(order.success_time).getTime() : null),
        userInfo: Array.isArray(order.userInfo) ? order.userInfo : (order.userInfo ? [order.userInfo] : []),
        nickName: order.nickName || order.nickname || '',
        avatarUrl: order.avatarUrl || order.avatar || '',
        consignee: order.consignee || order.address?.name || '',
        address: Array.isArray(order.address) ? order.address : (order.address ? [order.address] : []),
        goods: order.goods || []
      };
    });

    const ordersWithRefund = [];
    for (let item of orders) {
      const refundRes = await db.collection('shop_refund').where({ order_id: item.order_id }).limit(1).get();
      ordersWithRefund.push({
        ...item,
        refundInfo: refundRes.data[0] || null
      });
    }

    // 返回结果
    return {
      statusCode:200, 
      headers, 
      body:JSON.stringify({
        code: 200,
        message: '获取订单列表成功',
        data: {
          list: ordersWithRefund, 
          total,
          page,
          limit
        }
      })
    };

  } catch (error) {
    console.error('【云函数】获取订单列表失败：', error);
    return { 
      statusCode:500, 
      headers, 
      body:JSON.stringify({
        code: 500,
        message: '获取订单列表失败，请稍后重试',
        data: null
      })
    };
  }
};

exports.main = handler;
exports