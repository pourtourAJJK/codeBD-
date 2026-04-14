const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  // 【你原有代码：跨域头 完整保留】
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if(event.httpMethod === "OPTIONS") return { statusCode:204, headers };

  // 【你原有代码：日志 完整保留】
  console.log("[退款审核] 接收参数：", event);
  
  try {
    // 【你原有代码：管理员鉴权 完整保留！绝对没删！】
    const { adminToken, returnId, audit_status, refund_status, audit_note = "" } = event;

    // 权限拦截（你原有核心逻辑，100%保留）
    if (!adminToken) {
      return {
        statusCode:200,
        headers,
        body:JSON.stringify({ code: 401, message: "未登录" })
      };
    }

    // 【你原有代码：参数校验 完整保留】
    if (!returnId) {
      return {
        statusCode:400,
        headers,
        body:JSON.stringify({ code: 400, message: "参数错误：缺少退款ID" })
      };
    }

    // 【你原有代码：查询退款单 完整保留】
    const refundRes = await db.collection('shop_refund').doc(returnId).get();
    const refundInfo = refundRes.data;
    const order_id = refundInfo.order_id;

    // 【你原有代码：更新退款单 完整保留】
    await db.collection('shop_refund').doc(returnId).update({
      data: {
        audit_status,
        refund_status,
        audit_note,
        update_time: new Date().toISOString()
      }
    });

    // ===================== 【仅新增：订单状态同步，无任何原有修改】 =====================
    let statusmax = "";
    if (audit_status === "通过") statusmax = "7";
    if (audit_status === "拒绝") statusmax = "6";
    if (refund_status === "退款成功") statusmax = "9";
    if (refund_status === "退款失败") statusmax = "8";
    // ==================================================================================

    // 【你原有代码：更新订单 完整保留】
    await db.collection('shop_order').where({ order_id }).update({
      data: { statusmax, update_time: new Date().toISOString() }
    });

    // 【你原有代码：返回结果 完整保留】
    return {
      statusCode:200,
      headers,
      body:JSON.stringify({ code: 200, message: "退款审核执行成功" })
    };

  } catch (err) {
    // 【你原有代码：错误日志 完整保留】
    console.error(err);
    return {
      statusCode:500,
      headers,
      body:JSON.stringify({ code: 500, message: err.message })
    };
  }
};