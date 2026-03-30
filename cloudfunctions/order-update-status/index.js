const cloud = require('wx-server-sdk');
// 使用本地副本，避免部署遗漏公共utils
const { withResponse } = require('./response');


cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const ORDER_COLLECTION = 'shop_order';
const USER_COLLECTION = 'shop_user';
const ALLOWED_STATUS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];


const handler = async (event = {}) => {
  const timestamp = new Date().toISOString();
  const orderId = event.order_id || event.orderId || event.orderNo || event.out_trade_no || event.outTradeNo || event._id;
  const targetStatus = event.statusmax || event.status || '未提供';
  
  console.log(`[${timestamp}] [order-update-status-开始] [订单ID:${orderId}] 接收订单状态更新请求`);
  console.log(`[${timestamp}] [order-update-status-参数] [订单ID:${orderId}] 目标状态:${targetStatus}, 完整参数:`, event);

  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      console.error(`[${timestamp}] [order-update-status-错误] [订单ID:${orderId}] 未登录`);
      return { code: 401, message: '未登录', data: {} };
    }

    console.log(`[${timestamp}] [order-update-status-用户验证] [订单ID:${orderId}] 开始验证用户权限`);
    const userRes = await db.collection(USER_COLLECTION).where({ openid }).get();
    if (!userRes.data || userRes.data.length === 0) {
      console.error(`[${timestamp}] [order-update-status-错误] [订单ID:${orderId}] 用户不存在`);
      return { code: 500, message: '用户不存在', data: {} };
    }
    console.log(`[${timestamp}] [order-update-status-用户验证] [订单ID:${orderId}] 用户验证通过`);

    const { statusmax } = event;
    if (!orderId || statusmax === undefined) {
      console.error(`[${timestamp}] [order-update-status-错误] [订单ID:${orderId}] 缺少必要参数`);
      return { code: 500, message: '缺少必要参数', data: {} };
    }

    if (!ALLOWED_STATUS.includes(statusmax)) {
      console.error(`[${timestamp}] [order-update-status-错误] [订单ID:${orderId}] 订单状态不合法:${statusmax}`);
      return { code: 500, message: '订单状态不合法', data: {} };
    }
    console.log(`[${timestamp}] [order-update-status-参数校验] [订单ID:${orderId}] 参数校验通过`);

    const orderWhere = db.command.or([
      { order_id: orderId, openid },
      { orderId: orderId, openid },
      { orderNo: orderId, openid },
      { out_trade_no: orderId, openid },
      { _id: orderId, openid }
    ]);

    // 先查询订单当前状态，进行双字段安全校验
    console.log(`[${timestamp}] [order-update-status-查询订单] [订单ID:${orderId}] 开始查询当前订单状态`);
    const orderRes = await db.collection(ORDER_COLLECTION).where(orderWhere).limit(1).get();
    if (!orderRes.data || orderRes.data.length === 0) {
      console.error(`[${timestamp}] [order-update-status-错误] [订单ID:${orderId}] 订单不存在或无权限`);
      return { code: 500, message: '订单不存在或无权限', data: {} };
    }
    
    const currentOrder = orderRes.data[0];
    const currentPayStatus = currentOrder.pay_status;
    const currentStatusmax = currentOrder.statusmax;
    console.log(`[${timestamp}] [order-update-status-订单状态] [订单ID:${orderId}] 当前状态:${currentStatusmax}, 支付状态:${currentPayStatus}, 目标状态:${statusmax}`);
    
    // 双字段安全校验
    // 规则1: pay_status=0（未支付）→ 只允许 statusmax=1/6（待支付/已取消）
    if (currentPayStatus === 0 || currentPayStatus === '0') {
      if (statusmax !== "1" && statusmax !== "6") {
        console.error(`[${timestamp}] [order-update-status-错误] [订单ID:${orderId}] 未支付订单只能更新为待支付或已取消状态`);
        return { code: 500, message: '未支付订单只能更新为待支付或已取消状态', data: {} };
      }
    }
    
    // 规则2: pay_status=1（已支付）→ 禁止 statusmax=1（待支付）
    if (currentPayStatus === 1 || currentPayStatus === '1') {
      if (statusmax === "1") {
        console.error(`[${timestamp}] [order-update-status-错误] [订单ID:${orderId}] 已支付订单不能更新为待支付状态`);
        return { code: 500, message: '已支付订单不能更新为待支付状态', data: {} };
      }
    }
    console.log(`[${timestamp}] [order-update-status-安全校验] [订单ID:${orderId}] 双字段安全校验通过`);

    // 新增：允许更新超时控制相关字段
    const updateData = {
      statusmax,
      updatedAt: db.serverDate(),
    };
    if (event.cancelPayTime !== undefined) updateData.cancelPayTime = event.cancelPayTime;
    if (event.autoCancelStatus) updateData.autoCancelStatus = event.autoCancelStatus;
    // 允许同步更新收货地址
    if (event.address) {
      updateData.address = Array.isArray(event.address) ? event.address : (event.address ? [event.address] : []);
      // 同时更新收货人字段
      const addressObj = Array.isArray(event.address) && event.address.length > 0 ? event.address[0] : event.address;
      if (addressObj && addressObj.name) {
        updateData.consignee = addressObj.name;
      }
    }

    console.log(`[${timestamp}] [order-update-status-更新数据库] [订单ID:${orderId}] 开始更新shop_order表, 更新数据:`, { statusmax, hasAddress: !!event.address });
    const updateRes = await db.collection(ORDER_COLLECTION)
      .where(orderWhere)
      .update({ data: updateData });

    if (!updateRes.stats || updateRes.stats.updated === 0) {
      console.error(`[${timestamp}] [order-update-status-错误] [订单ID:${orderId}] 订单不存在或无权限, 更新记录数:${updateRes.stats?.updated || 0}`);
      return { code: 500, message: '订单不存在或无权限', data: {} };
    }
    console.log(`[${timestamp}] [order-update-status-更新数据库] [订单ID:${orderId}] shop_order表更新成功, 更新记录数:${updateRes.stats?.updated || 0}`);
    
    // ============== 新增：调用推送云函数 ==============
    try {
      console.log(`[${timestamp}] [order-update-status-推送通知] [订单ID:${orderId}] 开始调用order-push云函数`);
      await cloud.callFunction({
        name: "order-push",
        data: {
          doc: {
            statusmax: statusmax,
            _id: orderId,
            openid: openid
          }
        }
      });
      console.log(`[${timestamp}] [order-update-status-推送通知] [订单ID:${orderId}] ✅ 商家修改状态，推送触发成功`);
    } catch (e) {
      console.error(`[${timestamp}] [order-update-status-推送通知] [订单ID:${orderId}] ❌ 推送失败:`, e);
    }
    // ==================================================

    console.log(`[${timestamp}] [order-update-status-成功] [订单ID:${orderId}] 订单状态更新完成, 状态从${currentStatusmax}更新为${statusmax}`);
    return {
      code: 200,
      message: '更新订单状态成功',
      data: { orderId, statusmax }
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [order-update-status-异常] [订单ID:${orderId}] 更新订单状态失败`);
    console.error(`[${new Date().toISOString()}] [order-update-status-异常详情] [订单ID:${orderId}] 错误信息:`, error.message);
    console.error(`[${new Date().toISOString()}] [order-update-status-异常详情] [订单ID:${orderId}] 错误堆栈:`, error.stack);
    return { code: 500, message: '更新订单状态失败', data: {} };
  } finally {
    console.log(`[${new Date().toISOString()}] [order-update-status-结束] [订单ID:${orderId}] 订单状态更新请求处理结束`);
  }
};

exports.main = withResponse(handler);
