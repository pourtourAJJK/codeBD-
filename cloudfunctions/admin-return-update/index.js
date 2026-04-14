const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  // 原有跨域头 完整保留
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if(event.httpMethod === "OPTIONS") return { statusCode:204, headers };

  // 原有日志 完整保留
  console.log("[退款审核] 接收参数：", event);
  
  try {
    // 原有鉴权参数 完整保留
    const { adminToken, returnId, audit_status, refund_status, audit_note = "", account } = event;

    // 原有权限拦截 完整保留
    if (!adminToken) {
      return {
        statusCode:200,
        headers,
        body:JSON.stringify({ code: 401, message: "未登录" })
      };
    }

    // 原有参数校验 完整保留
    if (!returnId) {
      return {
        statusCode:400,
        headers,
        body:JSON.stringify({ code: 400, message: "参数错误：缺少退款ID" })
      };
    }

    // 修复：统一数字时间戳，根除格式报错
    const timestamp = Date.now();

    // 原有查询退款单 完整保留
    const refundRes = await db.collection('shop_refund').doc(returnId).get();
    const refundInfo = refundRes.data;
    const order_id = refundInfo.order_id;

    // ===================== 核心修复：状态映射逻辑 =====================
    let real_audit_status = audit_status;
    let real_refund_result_status = refund_status;
    let real_refund_status = refund_status;
    // 前端传审核状态，强制映射为数字：通过="2"，拒绝="3"
    if (audit_status === "通过") {
      real_audit_status = "2";
      real_refund_result_status = "3";
      real_refund_status = "2"; // 同意退款时，退单状态为"2"
    }
    if (audit_status === "拒绝") {
      real_audit_status = "3";
      real_refund_result_status = "4";
    }
    // ==================================================================================

    // 原有更新逻辑 + 修复时间格式 + 修复状态映射
    await db.collection('shop_refund').doc(returnId).update({
      data: {
        audit_status: real_audit_status,
        refund_result_status: real_refund_result_status,
        refund_status: real_refund_status,
        audit_note,
        audit_by: account || "管理员", // 填入商家的account
        audit_time: timestamp, // 审核时间（精确到秒）
        createdAt: timestamp, // 创建时间
        updatedAt: timestamp, // 更新时间
        update_time: timestamp // 数字时间戳，无报错
      }
    });

    // 当商家同意退款时，调用微信支付的退款API
    if (audit_status === "通过") {
      try {
        console.log("[退款审核] 调用微信支付退款API");
        const refundResult = await cloud.callFunction({
          name: "wxpayFunctions",
          data: {
            type: "wxpay_refund",
            refundId: returnId
          }
        });
        console.log("[退款审核] 微信支付退款API调用结果：", refundResult);
      } catch (refundError) {
        console.error("[退款审核] 调用微信支付退款API失败：", refundError);
        // 退款API调用失败不影响审核流程，只是记录错误
      }
    }

    // 订单状态映射逻辑
    let statusmax = "";
    if (real_audit_status === "2") statusmax = "7"; // 通过 -> 退款中
    if (real_audit_status === "3") statusmax = "6"; // 拒绝 -> 已取消
    if (real_refund_result_status === "4") statusmax = "8"; // 退款失败
    if (real_refund_result_status === "3") statusmax = "7"; // 退款中

    // 原有订单更新 + 修复时间格式
    await db.collection('shop_order').where({ order_id }).update({
      data: { statusmax, update_time: timestamp }
    });

    // 原有返回格式 完整保留
    return {
      statusCode:200,
      headers,
      body:JSON.stringify({ code: 200, message: "退款审核执行成功" })
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode:500,
      headers,
      body:JSON.stringify({ code: 500, message: err.message })
    };
  }
};