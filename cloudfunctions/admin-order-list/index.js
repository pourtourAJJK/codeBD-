// 管理员订单列表云函数（最终修复版）
const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库实例
const db = cloud.database();
const _ = db.command;

/**
 * 管理员查询订单列表
 * 支持：精准查询订单、分页、支付状态筛选、订单状态筛选、订单号搜索
 */
const handler = async (event, context) => {
  try {
    // 1. 接收入参（保留你原有所有参数）
    const { 
      page = 1, 
      limit = 10, 
      pay_status, 
      keyword 
    } = event;

    // 2.  核心修复：优先获取订单ID（精准查询，最高优先级）
    const orderId = event.order_id; 
    console.log("【云函数】接收前端传递的订单ID：", orderId);

    // 3. 初始化查询
    let query = db.collection('shop_order');

    // 4. 强制精准查询（有订单ID则只查这一个，解决订单错乱）
    if (orderId) {
      console.log("【云函数】执行精准查询：", orderId);
      query = query.where({
        order_id: orderId
      });
    }

    // 5. 原有筛选逻辑（保留不动）
    // 支付状态筛选
    if (pay_status !== undefined) {
      const payStatusValue = typeof pay_status === 'string' ? pay_status : String(pay_status);
      query = query.where({ pay_status: payStatusValue });
    }
    
    // 订单状态筛选
    if (event.statusmax !== undefined) {
      query = query.where({ statusmax: event.statusmax });
    }
    
    // 订单号模糊搜索
    if (keyword && !orderId) { // 精准查询时不触发搜索
      query = query.where({
        $or: [
          { orderNo: _.regex({ regex: keyword, options: 'i' }) },
          { order_id: _.regex({ regex: keyword, options: 'i' }) }
        ]
      });
    }
    
    // 6. 查询总数
    const totalRes = await query.count();
    const total = totalRes.total;
    console.log("【云函数】符合条件的订单总数：", total);

    // 7. 分页查询（按创建时间倒序）
    const ordersRes = await query
      .orderBy('createTime', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get();

    console.log("【云函数】查询到的订单数据：", ordersRes.data);

    // 8. 数据格式化（完全保留你原有字段映射，无任何修改）
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

    // 9. 返回结果
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
    console.error('【云函数】获取订单列表失败：', error);
    return {
      code: 500,
      message: '获取订单列表失败，请稍后重试',
      data: null
    };
  }
};

exports.main = handler;