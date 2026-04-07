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
  // 接收前端参数（完全不变）
  const { orderId, operateType } = event;

  try {
    // ===================== 原有逻辑 100% 保留 =====================
    let statusmax;
    let delivery_time;
    
    switch (operateType) {
      case "confirmDelivery":
        statusmax = "3"; // 安排发货 → 待配送
        delivery_time = new Date();
        break;
      case "startShipping":
        statusmax = "4"; // 开始配送 → 配送中
        break;
      case "completeOrder":
        statusmax = "5"; // 完成订单 → 已完成
        break;
      default:
        return { 
          statusCode:400, 
          headers, 
          body:JSON.stringify({ code: 400, msg: "无效的操作类型" })
        };
    }
    
    // 原有更新字段逻辑（不变）
    const updateData = { statusmax };
    if (delivery_time) {
      updateData.delivery_time = delivery_time;
    }
    
    // ===================== 🔥 唯一修复：替换错误的查询方式 =====================
    // 错误写法：.doc(orderId) → 用文档ID查询（你传的是业务订单号，报错）
    // 正确写法：.where({ order_id: orderId }) → 用你的业务订单号字段查询
    await db.collection('shop_order')
      .where({
        order_id: orderId  // 匹配你数据库的 order_id 字段
      })
      .update({
        data: updateData
      });
    
    // 原有返回格式（完全不变）
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
