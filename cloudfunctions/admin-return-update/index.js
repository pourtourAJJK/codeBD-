const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  console.log("[退款审核] 接收参数：", event);
  try {
    const { returnId, audit_status, refund_status, audit_note = "" } = event;

    // 1. 查询退款单，获取关联的订单ID
    const refundRes = await db.collection('shop_refund').doc(returnId).get();
    const refundInfo = refundRes.data;
    const order_id = refundInfo.order_id;

    // 2. 更新退款单状态
    await db.collection('shop_refund').doc(returnId).update({
      data: {
        audit_status,
        refund_status,
        audit_note,
        update_time: new Date().toISOString()
      }
    });

    // 🔥 修复点1：强制同步更新订单 statusmax（前端状态更新的关键！）
    let statusmax = "";
    if (audit_status === "通过") statusmax = "7";    // 待退款
    if (audit_status === "拒绝") statusmax = "6";    // 已取消（退款拒绝）
    if (refund_status === "退款成功") statusmax = "9";
    if (refund_status === "退款失败") statusmax = "8";

    await db.collection('shop_order').where({ order_id }).update({
      data: { statusmax, update_time: new Date().toISOString() }
    });

    return { code: 200, message: "退款审核执行成功" };
  } catch (err) {
    console.error(err);
    return { code: 500, message: err.message };
  }
};