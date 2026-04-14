// 云函数名称：return-create
// 功能：小程序用户提交退款申请（专用，无adminToken）
// 100%匹配云开发字段配置：存储类型NUMBER，时间为数字时间戳
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

  // 日志完整保留（和你原有格式一致）
  console.log("[小程序退款申请] 接收参数：", event);
  
  try {
    // 接收小程序参数（完全兼容你现有参数）
    const {
      order_id,
      reason,
      refund_amount,
      total_amount,
      transaction_id,
      user_openid,
      audit_by // 新增：接收操作人参数（管理员/用户）
    } = event;

    // 基础参数校验
    if (!order_id || !reason || !refund_amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ code: 400, message: "参数不完整" })
      };
    }

    // ✅ 核心：生成符合配置的数字时间戳（唯一修改的时间相关代码）
    const currentTimestamp = Date.now(); // 纯数字，毫秒级，完全匹配NUMBER存储类型

    // 生成退款信息（和你数据库字段完全一致）
    const refundData = {
      order_id,
      reason,
      refund_amount: Number(refund_amount),
      total_amount: Number(total_amount),
      transaction_id,
      user_openid: user_openid || event.userInfo.openId,
      audit_status: "待审核",       // 默认待审核
      refund_status: "1",             // 枚举标准：1=待审核，改为字符串类型
      refund_result_status: "待退款",
      audit_by: audit_by || "用户自主申请", // 新增：操作人/审核人字段
      // ✅ 所有时间字段统一为数字时间戳，100%符合配置，零字符串
      apply_time: currentTimestamp,
      create_time: currentTimestamp,
      update_time: currentTimestamp,
      out_refund_no: `REFUND_${order_id}_${Date.now()}` // 自动生成退款单号
    };

    // 写入退款表
    await db.collection('shop_refund').add({
      data: refundData
    });

    // 同步更新订单状态为退款中（订单的updateTime也改为数字时间戳，统一格式）
    await db.collection('shop_order').where({
      order_id: order_id
    }).update({
      data: {
        statusmax: "7",
        refund_status: "1",
        updateTime: currentTimestamp // 改为数字，避免订单页同步报错
      }
    });

    console.log("[小程序退款申请] 提交成功，订单号：", order_id);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ code: 200, message: "退款申请提交成功" })
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