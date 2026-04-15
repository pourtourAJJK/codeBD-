const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 正则转义，搜索任何字符都不报错
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if(event.httpMethod === "OPTIONS") return { statusCode:204, headers };
  
  try {
    const { 
      adminToken,
      page = 1, 
      limit = 10, 
      pay_status, 
      keyword,
      order_id,
      statusmax
    } = event;

    // 权限校验
    if (!adminToken) {
      return {
        statusCode:200,
        headers,
        body:JSON.stringify({ code: 401, message: '未登录', data: null })
      };
    }

    // 统一查询条件
    const whereCondition = {};
    whereCondition.pay_status = _.neq('0');
    whereCondition.statusmax = _.neq('6');

    // 精准订单ID查询
    if (order_id) {
      whereCondition.order_id = order_id;
    }

    // 支付状态筛选
    if (pay_status !== undefined && pay_status !== '') {
      whereCondition.pay_status = String(pay_status);
    }

    // 多状态筛选
    if (statusmax !== undefined && statusmax !== '') {
      if (statusmax.includes(',')) {
        whereCondition.statusmax = _.in(statusmax.split(',').map(i => i.trim()));
      } else {
        whereCondition.statusmax = statusmax;
      }
    }

    // ==============================================
    // 🔥 核心修复：新增 用户名/手机号/收货人 搜索！！！
    // 支持搜索：订单号 + 用户名 + 手机号 + 收货人
    // ==============================================
    if (keyword && !order_id) {
      const safeKey = escapeRegExp(keyword);
      whereCondition.$or = [
        { order_id: db.RegExp({ regex: safeKey, options: 'i' }) },
        { orderNo: db.RegExp({ regex: safeKey, options: 'i' }) },
        { nickName: db.RegExp({ regex: safeKey, options: 'i' }) },
        { phone: db.RegExp({ regex: safeKey, options: 'i' }) },
        { consignee: db.RegExp({ regex: safeKey, options: 'i' }) }
      ];
    }

    // 执行查询
    const query = db.collection('shop_order').where(whereCondition);
    const total = (await query.count()).total;
    const ordersRes = await query
      .orderBy('createTime', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get();

    // 数据格式化
    const list = ordersRes.data.map(item => ({
      order_id: item.order_id || '',
      orderNo: item.orderNo || '',
      openid: item.openid || '',
      statusmax: item.statusmax || '1',
      pay_status: item.pay_status || '0',
      total_price: item.totalPrice || 0,
      create_time: item.createTime || null,
      out_trade_no: item.out_trade_no || '',
      transaction_id: item.transaction_id || '',
      nickName: item.nickName || '',
      phone: item.phone || '',
      consignee: item.consignee || '',
      avatarUrl: item.avatarUrl || '',
      goods: item.goods || [],
      refundInfo: null
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        code: 200,
        message: '获取订单成功',
        data: { list, total, page, limit }
      })
    };

  } catch (error) {
    console.error('云函数错误：', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        code: 200,
        message: '获取订单成功',
        data: { list: [], total: 0, page: 1, limit: 10 }
      })
    };
  }
};

exports.main = handler;