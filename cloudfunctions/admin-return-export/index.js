const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 退货数据导出
exports.main = async (event, context) => {
  console.log("[退货管理-云函数] === 开始导出退货数据 ===");
  console.log("[退货管理-云函数] 导出条件：", event);
  
  try {
    const { returnStatus, startDate, endDate } = event;
    let query = db.collection('shop_return');

    // 导出筛选条件
    if (returnStatus) query = query.where({ return_status: returnStatus });
    if (startDate && endDate) {
      query = query.where({ create_time: _.gte(startDate).and(_.lte(endDate)) });
    }

    // 查询全部数据（不分页）
    const res = await query.orderBy('create_time', 'desc').get();
    
    console.log("[退货管理-云函数] 导出成功，总数：", res.data.length);
    console.log("[退货管理-云函数] === 退货数据导出完成 ===");
    
    return {
      code: 200,
      message: "导出成功",
      data: res.data
    };
  } catch (err) {
    console.error("[退货管理-云函数] 导出失败：", err);
    return { code: 500, message: "导出失败", data: null };
  }
};