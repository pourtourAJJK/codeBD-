const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 退款状态更新（适配新退款逻辑，修复参数不完整）
exports.main = async (event, context) => {
  console.log("[退款管理-云函数] === 开始执行退款审核操作 ===");
  console.log("[退款管理-云函数] 操作参数：", event);
  
  try {
    // 兼容新旧参数：旧returnId → 新id，旧operateType → 新audit_status
    const { 
      id = event.returnId, 
      audit_status = event.operateType === 'approve' ? "通过" : "拒绝",
      audit_note = "",
      refund_status = event.operateType === 'approve' ? "审核通过" : "审核拒绝",
      order_id
    } = event;
    
    // 强校验：必须有退款单ID（彻底解决参数不完整）
    if (!id) {
      return { code: 400, message: "参数不完整：缺少退款单ID", data: null };
    }

    const updateTime = new Date().toISOString();

    // 1. 更新退款单状态（shop_refund）
    await db.collection('shop_refund').doc(id).update({
      data: { 
        audit_status, 
        audit_note, 
        refund_status,
        audit_time: updateTime,
        update_time: updateTime 
      }
    });

    // 2. 同步更新订单statusmax（严格复用你的枚举）
    if (order_id) {
      const orderStatus = audit_status === "通过" ? "7" : "6"; // 7=待退款，6=已取消
      await db.collection('shop_order').where({ order_id: order_id }).update({
        data: { statusmax: orderStatus, update_time: updateTime }
      });
    }

    console.log("[退款管理-云函数] 操作成功！退款单/订单状态已更新");
    console.log("[退款管理-云函数] === 退款审核操作完成 ===");
    return { code: 200, message: "退款审核执行成功", data: null };
  } catch (err) {
    console.error("[退款管理-云函数] 操作失败：", err);
    return { code: 500, message: "退款审核失败：" + err.message, data: null };
  }
};