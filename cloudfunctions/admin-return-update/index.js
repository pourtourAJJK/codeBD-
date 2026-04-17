const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  // 原有跨域头 完整保留（完全不动）
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if(event.httpMethod === "OPTIONS") return { statusCode:204, headers };

  console.log("[退款审核] 接收参数：", event);
  const { type, user_openid, adminToken, returnId, account = "管理员", audit_note = "" } = event;
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

      // ✅ 新增：申请时写入createdAt，和updatedAt一致
      const timestamp = Date.now();
      const addRes = await db.collection('shop_refund').add({
        data: {
          ...event,
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
          openid: user_openid,
          createdAt: timestamp, // 申请时间=createdAt，永久不变
          updatedAt: timestamp, // 初始updatedAt=申请时间
          // 申请时的操作记录（前端已自动生成，这里补全）
          operation_records: [{
            time: timestamp,
            operator: "用户",
            content: "申请退款",
            status: "待审核"
          }]
        }
      });

      return { statusCode:200, headers, body:JSON.stringify({ code: 200, data: addRes, message: "退款申请提交成功" }) };
    } catch (e) {
      console.error("创建退款失败：", e);
      return { statusCode:500, headers, body:JSON.stringify({ code: 500, message: "退款申请失败：" + e.message }) };
    }
  }

  // ==============================================
  // 场景2：管理后台审核（100%还原Git逻辑 + 新增操作记录）
  // ==============================================
  try {
    const { returnId, audit_status, refund_status, audit_note = "" } = event;

    // 原有权限校验（完全不动）
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

    // 时间戳（原版保留，用于更新updatedAt）
    const timestamp = Date.now();

    // ===================== 【核心新增：操作记录追加逻辑】 =====================
    // 1. 获取原有操作记录，不存在则初始化空数组
    const oldRecords = refundInfo.operation_records || [];
    // 2. 根据操作类型生成新的操作记录
    let newRecordContent = "";
    let newRecordStatus = "";
    if (audit_status === "2") {
      newRecordContent = "商家审核通过";
      newRecordStatus = "审核通过";
    } else if (audit_status === "3") {
      newRecordContent = `商家审核拒绝，原因：${audit_note || "无"}`;
      newRecordStatus = "审核拒绝";
    } else if (refund_status === "退款成功") {
      newRecordContent = "退款成功";
      newRecordStatus = "退款成功";
    } else if (refund_status === "退款失败") {
      newRecordContent = "退款失败";
      newRecordStatus = "退款失败";
    } else {
      newRecordContent = "操作更新";
      newRecordStatus = "状态更新";
    }
    // 3. 生成新的操作记录（包含管理员账号、时间、内容）
    const newRecord = {
      time: timestamp,
      operator: account,
      content: newRecordContent,
      status: newRecordStatus
    };
    // 4. 追加到原有记录，生成新数组（不覆盖历史记录）
    const newOperationRecords = [...oldRecords, newRecord];
    // ==========================================================================

    // ===================== 数据库更新（核心：保留Git逻辑 + 新增字段） =====================
    await db.collection('shop_refund').doc(returnId).update({
      data: {
        // 🚨【绝对不动】Git原版状态：直接写入前端传的 "通过"/"拒绝"（退款校验关键！）
        audit_status: audit_status,
        refund_status: refund_status,
        audit_note: audit_note,
        update_time: timestamp,
        updateTime: db.serverDate(),

        // 🎯【你要的新增字段】仅加这些，不破坏任何逻辑
        refund_result_status: audit_status === "通过" ? "3" : "4", // 审核通过=3，拒绝=4
        audit_by: account,          // 操作人
        audit_time: db.serverDate(),// ✅ 修复1970时间（和项目统一）
        updatedAt: timestamp,         // ✅ 每次操作更新updatedAt=当前时间（商家操作时间）
        // ✅ 追加操作记录（不覆盖历史）
        operation_records: newOperationRecords
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

    // ===================== 【新增：写入操作记录到web_detail_refund集合】 =====================
    // 操作类型映射（对应action枚举）
    const actionMap = {
      '审核通过': "1",
      '审核拒绝': "2",
      '退款成功': "3",
      '退款失败': "4"
    };

    // 生成操作类型和详情
    let action = "1";
    let details = "";
    if (audit_status === "2") {
      action = actionMap['审核通过'];
      details = "商家审核通过退款申请";
    } else if (audit_status === "3") {
      action = actionMap['审核拒绝'];
      details = `商家审核拒绝退款申请，原因：${audit_note || "无"}`;
    } else if (refund_status === "退款成功") {
      action = actionMap['退款成功'];
      details = "退款成功";
    } else if (refund_status === "退款失败") {
      action = actionMap['退款失败'];
      details = "退款失败";
    }

    // 写入 web_detail_refund 集合（严格匹配数据模型）
    await db.collection('web_detail_refund').add({
      data: {
        orderId: order_id,          // 订单ID（模型字段）
        action: action,             // 操作类型（枚举，模型字段）
        operator: account,          // 操作人账号（模型字段）
        details: details,           // 操作详情（模型字段）
        timestamp: db.serverDate()  // 操作时间（服务器时间，不可篡改）
        // 系统字段 _id/createdAt/updatedAt 自动生成，无需手动传
      }
    });
    // =====================================================================================

    // 原版返回格式（不动）
    return { statusCode:200, headers, body:JSON.stringify({ code: 200, message: "退款审核执行成功" }) };

  } catch (err) {
    console.error("审核失败：", err);
    return { statusCode:500, headers, body:JSON.stringify({ code: 500, message: err.message }) };
  }
};