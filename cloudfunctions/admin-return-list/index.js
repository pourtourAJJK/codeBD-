const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  try {
    const { adminToken, page = 1, limit = 10, keyword } = event;

    // 权限拦截
    if (!adminToken) {
      return { code: 401, message: '未登录', data: null };
    }

    let query = db.collection('shop_refund');
    // 搜索
    if (keyword) {
      query = query.where({
        $or: [
          { order_id: _.regex({ regex: keyword, options: 'i' }) },
          { out_refund_no: _.regex({ regex: keyword, options: 'i' }) }
        ]
      });
    }

    const totalRes = await query.count();
    const total = totalRes.total;
    const ordersRes = await query
      .orderBy('apply_time', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get();

    return {
      code: 200,
      message: '获取退款列表成功',
      data: { list: ordersRes.data, total, page, limit }
    };

  } catch (error) {
    console.error('获取退款列表失败：', error);
    return { code: 500, message: '获取退款列表失败', data: null };
  }
};