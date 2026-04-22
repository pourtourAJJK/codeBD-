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
    
    const refundData = {
      order_id,
      reason,
      refund_amount: Number(refund_amount),
      total_amount: Number(total_amount),
      transaction_id,
      user_openid: user_openid || event.userInfo.openId,
      
      audit_status: "1",
      refund_status: "1",
      refund_result_status: "1",
      
      apply_time: timestamp,
      create_time: timestamp,
      update_time: timestamp,
      creatAt:timestamp,
      out_refund_no,
      createdAt: timestamp,
      
      operation_records: [{
        time: timestamp,
        operator: "用户",
        content: "提交退款申请",
        status: "待审核"
      }]
    };

    // 写入退款表
    const addResult = await db.collection('shop_refund').add({ data: refundData });
    const refundId = addResult.id; // 获取退款记录的 _id

    // 更新订单状态为退款中
    await db.collection('shop_order').where({ order_id }).update({
      data: {
        statusmax: "7",
        refund_status: "1",
        updateTime: timestamp
      }
    });

    // ===================== 新增：生成退款通知 =====================
    console.log('开始生成退款通知');
    try {
      const refundInfo = {
        order_id: order_id,
        out_refund_no: out_refund_no,
        refund_amount: refund_amount,
        audit_status: "待审核",
        refund_id: refundId // 传入退款ID
      };
      console.log('准备调用 create-refund-notification，refundInfo：', refundInfo);
      const result = await cloud.callFunction({
        name: 'create-refund-notification',
        data: { refundInfo }
      });
      console.log('create-refund-notification 调用结果：', result);
    } catch (error) {
      console.error('生成退款通知失败：', error);
    }
    // ===============================================================

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
          refund_status: "1",
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