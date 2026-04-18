// 订单逻辑删除云函数
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 固定集合名称
const ORDER_COLLECTION = 'shop_order';

exports.main = async (event = {}) => {
  try {
    // 获取小程序用户OPENID
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    // 仅在OPENID为空时返回未登录
    if (!openid) {
      return { code: 401, message: '未登录', data: {} };
    }

    // 获取订单ID
    const { orderId } = event;
    if (!orderId) {
      return { code: 400, message: '缺少订单ID', data: {} };
    }

    // 验证订单是否存在且属于当前用户
    const orderRes = await db.collection(ORDER_COLLECTION).where({
      order_id: orderId,
      openid: openid
    }).get();

    if (!orderRes.data || orderRes.data.length === 0) {
      return { code: 404, message: '订单不存在或无权操作', data: {} };
    }

    // 逻辑删除：更新订单状态为已删除
    await db.collection(ORDER_COLLECTION).where({
      order_id: orderId,
      openid: openid
    }).update({
      data: {
        is_deleted: true,
        deleted_at: db.serverDate(),
        update_time: Date.now(),
        updateTime: db.serverDate()
      }
    });

    // 标准返回格式
    return {
      code: 200,
      message: '订单删除成功',
      data: {}
    };

  } catch (error) {
    console.error('删除订单失败', error);
    return { code: 500, message: '删除订单失败', data: {} };
  }
};