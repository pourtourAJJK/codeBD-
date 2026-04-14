const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if(event.httpMethod === "OPTIONS") return { statusCode:204, headers };
  
  try {
    const { adminToken, id } = event;

    // 权限拦截
    if (!adminToken) {
      return { statusCode:200, headers, body:JSON.stringify({ code:401, message:"未登录", data:null }) };
    }
    if (!id) {
      return { statusCode:400, headers, body:JSON.stringify({ code:400, message:"退款ID不能为空", data:null }) };
    }

    // 查询退款详情
    const refundRes = await db.collection('shop_refund').doc(id).get();
    if (!refundRes.data) {
      return { statusCode:404, headers, body:JSON.stringify({ code:404, message:"退款记录不存在", data:null }) };
    }

    const refundDetail = {
      ...refundRes.data,
      // 统一Web端必填字段命名
      auditStatus: refundRes.data.audit_status || '',
      refundStatus: refundRes.data.refund_status || '',
      refundResultStatus: refundRes.data.refund_result_status || '',
      applyTime: refundRes.data.apply_time || '',
      auditTime: refundRes.data.audit_time || ''
    };

    // 返回结果
    return {
      statusCode:200,
      headers,
      body:JSON.stringify({
        code:200,
        message:"获取退款详情成功",
        data: refundDetail
      })
    };

  } catch (error) {
    console.error('【云函数】获取退款详情失败：', error);
    return {
      statusCode:500,
      headers,
      body:JSON.stringify({
        code:500,
        message:"获取退款详情失败",
        data:null
      })
    };
  }
};

exports.main = handler;