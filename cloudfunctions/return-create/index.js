// 云函数名称：return-create
// 功能：小程序用户提交退款申请（专用，无adminToken）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if(event.httpMethod === "OPTIONS") return { statusCode:204, headers };

  console.log("[小程序退款申请] 接收参数：", event);
  
  try {
    const {
      order_id,
      reason,
      refund_amount,
      total_amount,
      transaction_id,
      user_openid
    } = event;

    if (!order_id || !reason || !refund_amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ code: 400, message: "参数不完整" })
      };
    }

    // 统一数字时间戳（彻底修复字段格式错误）
    const timestamp = Date.now();
    
    // 退款状态枚举：1=待审核 2=已同意 3=已拒绝 4=已退款
    const out_refund_no = `REFUND_${order_id}_${timestamp}`;
    const refundData = {
      order_id,
      reason,
      refund_amount: Number(refund_amount),
      total_amount: Number(total_amount),
      transaction_id,
      user_openid: user_openid || event.userInfo.openId,
      audit_status: "待审核",
      refund_status: "1", // 严格枚举，改为字符串类型
      refund_result_status: "待退款",
      // 已修复：纯数字时间戳，无报错
      apply_time: timestamp,
      create_time: timestamp,
      update_time: timestamp,
      out_refund_no,
      
      // 👇 你要求的操作记录 已添加
      operation_records: [{
        time: timestamp,
        operator: "用户",
        content: "提交退款申请",
        status: "待审核"
      }]
    };

    // 写入退款表
    await db.collection('shop_refund').add({ data: refundData });

    // 更新订单状态为退款中
    await db.collection('shop_order').where({ order_id }).update({
      data: {
        statusmax: "7",
        refund_status: "1",
        updateTime: timestamp
      }
    });

    console.log("[小程序退款申请] 提交成功，订单号：", order_id);
    
    // ===================== 修复点 =====================
    // ✅ 返回 refund_status 等核心字段给前端
    // ==================================================
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        code: 200, 
        message: "退款申请提交成功",
        data: {
          order_id,
          out_refund_no,
          refund_status: "1",        // 前端需要的字段，改为字符串类型
          refund_status_text: "待审核"
        }
      })
    };

  } catch (err) {
    console.error("[小程序退款申请] 失败：", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ code: 500, message: "退款申请失败：" + err.message })
    };
  }
};