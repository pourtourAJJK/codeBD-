const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 退款数据导出
exports.main = async (event, context) => {
  console.log("[退款管理-云函数] === 开始导出退款数据 ===");
  console.log("[退款管理-云函数] 导出条件：", event);
  
  try {
    // 1. 接收前端传的 token
    const { adminToken, audit_status, startDate, endDate } = event;

    // 2. 没有 token → 直接返回空（权限拦截）
    if (!adminToken) {
      return { code: 401, message: "未登录", data: null };
    }

    // 3. 有权限 → 查询数据库
    // 核心修改：shop_return → shop_refund
    let query = db.collection('shop_refund');

    // 导出筛选条件
    if (audit_status) query = query.where({ audit_status: audit_status });
    if (startDate && endDate) {
      query = query.where({ apply_time: _.gte(startDate).and(_.lte(endDate)) });
    }

    // 查询全部数据（不分页）
    const res = await query.orderBy('apply_time', 'desc').get();
    
    console.log("[退款管理-云函数] 导出成功，总数：", res.data.length);
    console.log("[退款管理-云函数] === 退款数据导出完成 ===");
    
    return {
      code: 200,
      message: "导出成功",
      data: res.data
    };
  } catch (err) {
    console.error("[退款管理-云函数] 导出失败：", err);
    return { code: 500, message: "导出失败", data: null };
  }
};