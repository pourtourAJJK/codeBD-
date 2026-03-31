const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 退款状态更新（联动审核+微信退款）
exports.main = async (event, context) => {
  console.log("[退款管理-云函数] === 开始执行退款审核操作 ===");
  console.log("[退款管理-云函数] 操作参数：", event);
  
  try {
    // 接收适配退款的参数（核心修改）
    const { id, order_id, audit_status, audit_note, refund_status } = event;
    
    // 强校验
    if (!id || !audit_status) {
      return { code: 400, message: "参数不完整", data: null };
    }

    const updateTime = new Date().toISOString();

    // 1. 更新退款单状态（核心修改：shop_return → shop_refund）
    await db.collection('shop_refund').doc(id).update({
      data: { 
        audit_status, 
        audit_note, 
        refund_status,
        audit_time: updateTime,
        update_time: updateTime 
      }
    });

    // 2. 同步更新订单状态
    if (order_id) {
      await db.collection('shop_order').where({ order_id: order_id }).update({
        data: { statusmax: refund_status === "审核通过" ? "7" : "6", update_time: updateTime }
      });
    }

    console.log("[退款管理-云函数] 操作成功！退款单/订单状态已更新");
    console.log("[退款管理-云函数] === 退款审核操作完成 ===");
    return { code: 200, message: "退款审核执行成功", data: null };
  } catch (err) {
    console.error("[退款管理-云函数] 操作失败：", err);
    return { code: 500, message: "退款审核失败", data: null };
  }
};