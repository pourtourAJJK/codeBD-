const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 退货列表查询（全链路日志版）
exports.main = async (event, context) => {
  console.log("[退货管理-云函数] === 开始查询退货列表 ===");
  console.log("[退货管理-云函数] 入参：", event);
  
  try {
    const {
      page = 1,
      limit = 10,
      returnId,
      orderId,
      returnStatus,
      startDate,
      endDate,
      customerInfo
    } = event;

    // 初始化查询
    let query = db.collection('shop_return');

    // 精准筛选
    if (returnId) query = query.where({ return_id: returnId });
    if (orderId) query = query.where({ order_id: orderId });
    if (returnStatus) query = query.where({ return_status: returnStatus });
    if (customerInfo) {
      query = query.where({
        $or: [
          { customer_name: _.regex({ regex: customerInfo, options: 'i' }) },
          { customer_phone: _.regex({ regex: customerInfo, options: 'i' }) }
        ]
      });
    }

    // 日期范围筛选
    if (startDate && endDate) {
      query = query.where({
        create_time: _.gte(startDate).and(_.lte(endDate))
      });
    }

    // 总数统计
    const totalRes = await query.count();
    const total = totalRes.total;

    // 分页查询
    const res = await query
      .orderBy('create_time', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get();

    console.log("[退货管理-云函数] 查询成功，总数：", total, "数据：", res.data);
    console.log("[退货管理-云函数] === 退货列表查询完成 ===");

    return {
      code: 200,
      message: "获取退货列表成功",
      data: {
        list: res.data,
        total,
        page,
        limit
      }
    };
  } catch (err) {
    console.error("[退货管理-云函数] 查询失败：", err);
    return { code: 500, message: "获取退货列表失败", data: null };
  }
};
