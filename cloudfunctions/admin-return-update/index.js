const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 退货状态更新（联动订单statusmax）
exports.main = async (event, context) => {
  console.log("[退货管理-云函数] === 开始执行退货操作 ===");
  console.log("[退货管理-云函数] 操作参数：", event);
  
  try {
    const { return_id, order_id, operateType } = event;
    
    // 强校验
    if (!return_id || !operateType) {
      return { code: 400, message: "参数不完整", data: null };
    }

    let returnStatus, orderStatus;
    const updateTime = new Date().toISOString();

    // 操作映射（贴合项目状态规则）
    switch (operateType) {
      case 'approve': // 审核通过 → 待退款
        returnStatus = "approved";
        orderStatus = "7";
        break;
      case 'reject': // 拒绝 → 已取消
        returnStatus = "rejected";
        orderStatus = "6";
        break;
      case 'confirmReceipt': // 确认收货 → 退款成功
        returnStatus = "completed";
        orderStatus = "9";
        break;
      default:
        return { code: 400, message: "非法操作类型", data: null };
    }

    // 1. 更新退货单状态
    await db.collection('shop_return').doc(return_id).update({
      data: { return_status: returnStatus, update_time: updateTime }
    });

    // 2. 同步更新订单statusmax（核心联动）
    if (order_id) {
      await db.collection('shop_order').where({ order_id: order_id }).update({
        data: { statusmax: orderStatus, update_time: updateTime }
      });
    }

    console.log("[退货管理-云函数] 操作成功！退货单/订单状态已更新");
    console.log("[退货管理-云函数] === 退货操作完成 ===");
    return { code: 200, message: "退货操作执行成功", data: null };
  } catch (err) {
    console.error("[退货管理-云函数] 操作失败：", err);
    return { code: 500, message: "退货操作失败", data: null };
  }
};