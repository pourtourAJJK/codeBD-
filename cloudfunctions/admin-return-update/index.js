const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  console.log("[退款审核] 接收参数：", event);
  const { type, user_openid, adminToken, returnId } = event;
  const wxContext = cloud.getWXContext();

  // ==============================================
  // 场景1：小程序用户 - 发起退款申请（修复字段+校验）
  // ==============================================
  if (type === 'create_refund') {
    // 身份校验
    if (!user_openid || user_openid !== wxContext.OPENID) {
      return { code: 401, message: "用户身份校验失败" };
    }
    // 订单必填参数校验
    if (!event.order_id) {
      return { code: 400, message: "参数错误：缺少订单号" };
    }

    try {
      // 【新增校验】1. 校验订单是否存在
      const orderRes = await db.collection('shop_order').where({
        order_id: event.order_id,
        openid: user_openid
      }).get();
      if (orderRes.data.length === 0) {
        return { code: 400, message: "订单不存在或无权操作" };
      }

      // 【新增校验】2. 校验是否重复发起退款
      const repeatRefund = await db.collection('shop_refund').where({
        order_id: event.order_id
      }).get();
      if (repeatRefund.data.length > 0) {
        return { code: 400, message: "该订单已发起退款，请勿重复申请" };
      }

      // 创建退款记录（适配你的数据库字段名）
      const addRes = await db.collection('shop_refund').add({
        data: {
          ...event,
          createTime: db.serverDate(), // 统一字段：小驼峰
          updateTime: db.serverDate(),
          openid: user_openid
        }
      });

      return {
        code: 200,
        data: addRes,
        message: "退款申请提交成功"
      };
    } catch (e) {
      console.error("创建退款失败：", e);
      return { code: 500, message: "退款申请失败：" + e.message };
    }
  }

  // ==============================================
  // 场景2：管理后台管理员 - 审核退款（修复权限+逻辑）
  // ==============================================
  try {
    const { audit_status, refund_status, audit_note = "" } = event;

    // 【修复1】完整权限校验：验证token是否有效
    if (!adminToken) {
      return { code: 401, message: "未登录" };
    }
    const adminRes = await db.collection('admin_user').where({ token: adminToken }).get();
    if (adminRes.data.length === 0) {
      return { code: 401, message: "登录已失效，请重新登录" };
    }

    // 参数校验
    if (!returnId) {
      return { code: 400, message: "参数错误：缺少退款ID" };
    }

    // 查询退款单 + 关联订单
    const refundRes = await db.collection('shop_refund').doc(returnId).get();
    if (!refundRes.data) {
      return { code: 400, message: "退款单不存在" };
    }
    const refundInfo = refundRes.data;
    const order_id = refundInfo.order_id;

    // 更新退款单状态（适配你的字段名）
    await db.collection('shop_refund').doc(returnId).update({
      data: {
        audit_status,
        refund_status,
        audit_note,
        updateTime: db.serverDate()
      }
    });

    // 【修复2】订单状态逻辑：增加兜底，避免空值
    let statusmax = "";
    if (audit_status === "通过") {
      statusmax = "7";    // 待退款
    } else if (audit_status === "拒绝") {
      statusmax = "6";    // 已取消（退款拒绝）
    } else if (refund_status === "退款成功") {
      statusmax = "9";
    } else if (refund_status === "退款失败") {
      statusmax = "8";
    } else {
      statusmax = refundInfo.statusmax || "1"; // 兜底默认状态
    }

    // 同步更新订单（适配你的字段名）
    await db.collection('shop_order').where({ order_id }).update({
      data: {
        statusmax,
        updateTime: db.serverDate()
      }
    });

    return { code: 200, message: "退款审核执行成功" };
  } catch (err) {
    console.error("审核失败：", err);
    return { code: 500, message: err.message };
  }
};