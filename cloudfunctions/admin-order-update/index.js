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
  
  try {
    // 1. 接收前端传的 token
    // 🔥 最小修改1：把 orderId 改为 order_id（和前端传参一致）
    const { adminToken, order_id, operateType } = event;

    // 2. 没有 token → 直接返回空（权限拦截）
    if (!adminToken) {
      return {
        statusCode:200,
        headers,
        body:JSON.stringify({ code: 401, msg: "未登录" })
      };
    }

    // 3. 基础校验
    // 🔥 同步修改校验参数
    if (!order_id || !operateType) {
      return {
        statusCode:400,
        headers,
        body:JSON.stringify({ code: 400, msg: "订单ID和操作类型不能为空" })
      };
    }

    // 4. 有权限 → 操作数据库

    let statusmax;
    let delivery_time;
    
    // 🔥 最小修改2：适配你的流程（删除无用状态，直接2→4→5）
    switch (operateType) {
      case "startShipping":
        statusmax = "4"; // 待配送 → 配送中
        delivery_time = new Date();
        break;
      case "completeOrder":
        statusmax = "5"; // 配送中 → 已完成
        break;
      default:
        return { 
          statusCode:400, 
          headers, 
          body:JSON.stringify({ code: 400, msg: "无效的操作类型" })
        };
    }
    
    const updateData = { 
      statusmax,
      updateTime: new Date().toISOString()
    };
    if (delivery_time) {
      updateData.delivery_time = delivery_time;
    }
    
    // 🔥 最小修改3：同步改为 order_id
    await db.collection('shop_order')
      .where({
        order_id: order_id
      })
      .update({
        data: updateData
      });
    
    return { 
      statusCode:200, 
      headers, 
      body:JSON.stringify({ code: 0, msg: "操作成功" })
    };

  } catch (err) {
    console.error("更新失败：", err);
    return { 
      statusCode:500, 
      headers, 
      body:JSON.stringify({ code: -1, msg: err.message })
    };
  }
};