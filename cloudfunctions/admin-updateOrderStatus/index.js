// 更新订单状态云函数
const cloud = require('wx-server-sdk');

const { withResponse } = require('../utils/response');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库实例
const db = cloud.database();
const _ = db.command;

/**
 * 更新订单状态
 * @param {Object} event - 事件参数
 * @param {string} event.orderId - 订单ID
 * @param {number} event.statusmax - 新的订单状态
 * @param {string} event.operatorId - 操作人ID
 * @param {string} event.remark - 操作备注
 * @returns {Object} - 操作结果
 */
const handler = async (event, context) => {
  try {
    const { orderId, statusmax, operatorId, remark } = event;
    
    // 参数验证
    if (!orderId || statusmax === undefined) {
      return {
        code: 400,
        message: '订单ID和状态不能为空',
        data: null
      };
    }
    
    // 验证操作人是否为管理员   
    const adminRes = await db.collection('admin_user').where({
      _id: operatorId
    }).get();
    
    if (adminRes.data.length === 0) {
      return {
        code: 403,
        message: '无权限执行此操作',
        data: null
      };
    }
    
    // 获取订单当前状态
    const orderRes = await db.collection('shop_order').where({ order_id: orderId }).limit(1).get();
    if (!orderRes.data || orderRes.data.length === 0) {
      return {
        code: 404,
        message: '订单不存在',
        data: null
      };
    }
    
    const order = orderRes.data[0];
    
    // 检查状态是否发生变化
    if (String(order.statusmax) === String(statusmax)) {
      return {
        code: 200,
        message: '订单状态未发生变化',
        data: {
          orderId,
          statusmax
        }
      };
    }
    
    // 标准化状态值（转换为字符串格式）
    const normalizedStatus = String(statusmax);
    
    // 双字段安全校验
    const currentPayStatus = order.pay_status;
    const currentStatusmax = order.statusmax;
    
    // 规则1: pay_status=0（未支付）→ 只允许 statusmax=1/6（待支付/已取消）
    if (currentPayStatus === 0 || currentPayStatus === '0') {
      if (normalizedStatus !== "1" && normalizedStatus !== "6") {
        return { code: 500, message: '未支付订单只能更新为待支付或已取消状态', data: null };
      }
    }
    
    // 规则2: pay_status=1（已支付）→ 禁止 statusmax=1（待支付）
    if (currentPayStatus === 1 || currentPayStatus === '1') {
      if (normalizedStatus === "1") {
        return { code: 500, message: '已支付订单不能更新为待支付状态', data: null };
      }
    }
    
    // 规则3: 仅管理员可修改 3/4/7/8/9 状态（待配送/配送中/退款相关）
    const adminOnlyStatus = ["3", "4", "7", "8", "9"];
    if (adminOnlyStatus.includes(normalizedStatus)) {
      // 已验证管理员身份，允许操作
      console.log('管理员操作：更新订单状态为', normalizedStatus);
    }
    
    // 更新订单状态    
    const updateResult = await db.collection('shop_order').where({ order_id: orderId }).update({
      data: {
        statusmax: normalizedStatus,
        updateTime: db.serverDate()
      }
    });
    
    // 记录订单状态变更日志
    await db.collection('orderLogs').add({
      data: {
        orderId: orderId,
        orderNo: order.orderNo,
        beforeStatus: String(order.statusmax),
        afterStatus: String(normalizedStatus),
        operatorId: operatorId,
        operatorName: adminRes.data[0].username,
        remark: remark || '',
        createTime: db.serverDate()
      }
    });
    
    // 订单状态变更通知（注意：实际项目应使用订阅消息或消息推送）
    await sendOrderStatusNotification(order, normalizedStatus); 
    return {
      code: 200,
      message: '更新订单状态成功',
      data: {
        orderId,
        statusmax,
        updatedCount: updateResult.stats.updated
      }
    };
  } catch (error) {
    console.error('更新订单状态失败', error);
    return {
      code: 500,
      message: '更新订单状态失败，请稍后重试',
      data: null
    };
  }
};

/**
 * 发送订单状态变更通知
 * @param {Object} order - 订单信息
 * @param {number} newStatus - 新的订单状态
 */
async function sendOrderStatusNotification(order, newStatus) {
  try {
    // 获取用户的openid
    const userOpenid = order.openid;
    if (!userOpenid) return;
    
    // 构建消息内容
    const statusText = getOrderStatusText(newStatus);
    const message = {
      touser: userOpenid,
      template_id: 'your-template-id', // 替换为实际的模板ID
      page: `/pages/order/detail/detail?id=${order.order_id}`,
      data: {
        thing1: {
          value: order.orderNo || order.order_id
        },
        time2: {
          value: new Date().toLocaleString('zh-CN')
        },
        thing3: {
          value: statusText
        },
        thing4: {
          value: `订单${order.orderNo}状态已更新为${statusText}`
        }
      }
    };
    
    // 发送订阅消息（实际项目需要用户授权模板）
    // 
    await cloud.openapi.subscribeMessage.send(message);
    console.log('订单状态变更通知已发送', {
      orderId: order._id,
      openid: userOpenid,
      status: newStatus
    });
  } catch (error) {
    console.error('发送订单状态变更通知失败:', error);
  }
}

/**
 * 获取订单状态文本
 * @param {string|number} status - 订单状态码
 * @returns {string} - 订单状态文本
 */
function getOrderStatusText(status) {
  const statusMap = {
    1: '待支付', '1': '待支付',
    2: '待接单', '2': '待接单',
    3: '待配送', '3': '待配送',
    4: '配送中', '4': '配送中',
    5: '已完成', '5': '已完成',
    6: '已取消', '6': '已取消',
    7: '退款中', '7': '退款中',
    8: '退款中', '8': '退款中',
    9: '退款成功', '9': '退款成功'
  };
  return statusMap[String(status)] || '未知状态';
}

exports.main = withResponse(handler);