const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  // 原有跨域头 完整保留
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if(event.httpMethod === "OPTIONS") return { statusCode:204, headers };

  console.log("[退款审核] 接收参数：", event);
  const { type, user_openid, adminToken, returnId, account = "管理员" } = event;
  const wxContext = cloud.getWXContext();

  // ==============================================
  // 场景1：小程序退款（Git原版，完全不动）
  // ==============================================
  if (type === 'create_refund') {
    if (!user_openid || user_openid !== wxContext.OPENID) {
      return { statusCode:200, headers, body:JSON.stringify({ code: 401, message: "用户身份校验失败" }) };
    }
    if (!event.order_id) {
      return { statusCode:400, headers, body:JSON.stringify({ code: 400, message: "参数错误：缺少订单号" }) };
    }

    try {
      const orderRes = await db.collection('shop_order').where({
        order_id: event.order_id,
        openid: user_openid
      }).get();
      if (orderRes.data.length === 0) {
        return { statusCode:400, headers, body:JSON.stringify({ code: 400, message: "订单不存在或无权操作" }) };
      }

      const repeatRefund = await db.collection('shop_refund').where({
        order_id: event.order_id
      }).get();
      if (repeatRefund.data.length > 0) {
        return { statusCode:400, headers, body:JSON.stringify({ code: 400, message: "该订单已发起退款，请勿重复申请" }) };
      }

      const addRes = await db.collection('shop_refund').add({
        data: {
          ...event,
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
          openid: user_openid
        }
      });

      return { statusCode:200, headers, body:JSON.stringify({ code: 200, data: addRes, message: "退款申请提交成功" }) };
    } catch (e) {
      console.error("创建退款失败：", e);
      return { statusCode:500, headers, body:JSON.stringify({ code: 500, message: "退款申请失败：" + e.message }) };
    }
  }

  // ==============================================
  // 场景2：管理后台审核（100%还原Git成功逻辑 + 仅加需求）
  // ==============================================
  try {
    const { returnId, audit_status, refund_status, audit_note = "" } = event;

    // 权限校验（完全不动）
    if (!adminToken) {
      return { statusCode:200, headers, body:JSON.stringify({ code: 401, message: "未登录" }) };
    }
    const adminRes = await db.collection('admin_user').where({ token: adminToken }).get();
    if (adminRes.data.length === 0) {
      return { statusCode:200, headers, body:JSON.stringify({ code: 401, message: "登录已失效，请重新登录" }) };
    }

    if (!returnId) {
      return { statusCode:400, headers, body:JSON.stringify({ code: 400, message: "参数错误：缺少退款ID" }) };
    }

    const refundRes = await db.collection('shop_refund').doc(returnId).get();
    if (!refundRes.data) {
      return { statusCode:400, headers, body:JSON.stringify({ code: 400, message: "退款单不存在" }) };
    }
    const refundInfo = refundRes.data;
    const order_id = refundInfo.order_id;

    // 时间戳（原版保留）
    const timestamp = Date.now();

    // ===================== 数据库更新（核心！还原原版状态写入） =====================
    await db.collection('shop_refund').doc(returnId).update({
      data: {
        // 🚨【绝对不动】Git原版状态：直接写入前端传的 "通过"/"拒绝"（退款校验关键！）
        audit_status: audit_status,
        refund_status: refund_status,
        audit_note: audit_note,
        update_time: timestamp,
        updateTime: db.serverDate(),

        // 🎯【你要的新增字段】仅加这些，不破坏任何逻辑
        refund_result_status: "3",  // 审核通过默认值
        audit_by: account,          // 操作人
        audit_time: db.serverDate(),// ✅ 修复1970时间（和项目统一）
        updatedAt: timestamp         // 正常时间
      }
    });

    // 订单状态（Git原版，完全不动）
    let statusmax = "1";
    if (audit_status === "通过") statusmax = "7";
    if (audit_status === "拒绝") statusmax = "6";
    if (refund_status === "退款成功") statusmax = "9";
    if (refund_status === "退款失败") statusmax = "8";

    await db.collection('shop_order').where({ order_id }).update({
      data: { 
        statusmax, 
        update_time: timestamp,
        updateTime: db.serverDate()
      }
    });

    // 原版返回格式（不动）
    return { statusCode:200, headers, body:JSON.stringify({ code: 200, message: "退款审核执行成功" }) };

  } catch (err) {
    console.error("审核失败：", err);
    return { statusCode:500, headers, body:JSON.stringify({ code: 500, message: err.message }) };
  }
};