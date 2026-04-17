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
    // 1. 接收参数：新增 account 操作人账号（前端必传）
    const { 
      adminToken, 
      order_id, 
      operateType,
      account // 🔥 关键：操作人账号（持久化依据，前端登录态传递）
    } = event;

    // 2. 权限拦截
    if (!adminToken) {
      return {
        statusCode:200,
        headers,
        body:JSON.stringify({ code: 401, msg: "未登录" })
      };
    }

    // 3. 基础校验：新增 account 必传
    if (!order_id || !operateType || !account) {
      return {
        statusCode:400,
        headers,
        body:JSON.stringify({ code: 400, msg: "订单ID/操作类型/操作人不能为空" })
      };
    }

    // 4. 订单状态逻辑（原有逻辑100%保留，清理Git冲突）
    let statusmax;
    let delivery_time;

    switch (operateType) {
      case "confirmDelivery":
        statusmax = "3"; // 安排发货 → 待配送
        delivery_time = new Date();
        break;
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

    // 订单更新数据
    const updateData = { 
      statusmax,
      updateTime: new Date().toISOString()
    };
    if (delivery_time) {
      updateData.delivery_time = delivery_time;
    }

    // 5. 执行订单更新（原有逻辑）
    await db.collection('shop_order')
      .where({ order_id: order_id })
      .update({ data: updateData });

    // ===================== 🔥 核心新增：写入发货操作记录 =====================
    // 操作类型映射（对应action枚举）
    const actionMap = {
      confirmDelivery: "1",
      startShipping: "2",
      completeOrder: "3"
    };
    const action = actionMap[operateType];
    const details = `管理员【${account}】执行【${action}】操作，订单ID：${order_id}`;

    // 写入 web_details 集合（严格匹配你的数据模型）
    await db.collection('web_details').add({
      data: {
        orderId: order_id,          // 订单ID（模型字段）
        action: action,             // 操作类型（枚举，模型字段）
        operator: account,          // 操作人账号（模型字段，无operatorName）
        details: details,           // 操作详情（模型字段）
        timestamp: db.serverDate()  // 操作时间（服务器时间，不可篡改）
        // 系统字段 _id/createdAt/updatedAt 自动生成，无需手动传
      }
    });
    // ======================================================================

    // 原有返回格式
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