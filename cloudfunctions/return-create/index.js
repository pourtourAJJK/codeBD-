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

    const timestamp = Date.now();
    const out_refund_no = `REFUND_${order_id}_${timestamp}`;
    
    // ===================== 核心修复区 =====================
    // 🔥 1. 严格使用字符串！不要用数字 1/2/3/4
    // 根据你的模型选项：
    // "1" -> 待审核 (字符串)
    // "3" -> 已拒绝
    // =======================================================
    const refundData = {
      order_id,
      reason,
      refund_amount: Number(refund_amount),
      total_amount: Number(total_amount),
      transaction_id,
      user_openid: user_openid || event.userInfo.openId,
      
      // ✅ 修复：这里必须是字符串 "1"，不能是数字 1
      audit_status: "1", 
      
      // ✅ 修复：退单状态，填入字符串 "待审核" 或对应枚举值
      // 这里根据你的模型，应该填选项对应的标识，这里我们填入稳定态 "待审核"
      refund_status: "1", 
      
      refund_result_status: "1", // 对应模型选项
      
      // 已修复：纯数字时间戳
      apply_time: timestamp,
      create_time: timestamp,
      update_time: timestamp,
      creatAt:timestamp,
      out_refund_no,
      // 👇 新增：与另一函数updatedAt格式完全一致（毫秒时间戳）
      createdAt: timestamp,
      
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
        refund_status: "1", // 👈 同步到订单的也必须是字符串
        updateTime: timestamp
      }
    });

    console.log("[小程序退款申请] 提交成功，订单号：", order_id);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        code: 200, 
        message: "退款申请提交成功",
        data: {
          order_id,
          out_refund_no,
          refund_status: "1", // 前端展示可以转成文本，后端存储必须匹配模型
          refund_status_text: "1"
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