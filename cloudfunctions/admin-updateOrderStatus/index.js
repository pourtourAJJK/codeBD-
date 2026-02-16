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
 * @param {number} event.status - 新的订单状态
 * @param {string} event.operatorId - 操作人ID
 * @param {string} event.remark - 操作备注
 * @returns {Object} - 操作结果
 */
const handler = async (event, context) => {
  try {
    const { orderId, status, operatorId, remark } = event;
    
    // 参数验证
    if (!orderId || status === undefined) {
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
    if (order.status === status) {
      return {
        code: 200,
        message: '订单状态未发生变化',
        data: {
          orderId,
          status
        }
      };
    }
    
    // 更新订单状态    
    const updateResult = await db.collection('shop_order').where({ order_id: orderId }).update({
      data: {
        status: status,
        updateTime: db.serverDate()
      }
    });
    
    // 记录订单状态变更日志
    await db.collection('orderLogs').add({
      data: {
        orderId: orderId,
        orderNo: order.orderNo,
        beforeStatus: order.status,
        afterStatus: status,
        operatorId: operatorId,
        operatorName: adminRes.data[0].username,
        remark: remark || '',
        createTime: db.serverDate()
      }
    });
    
    // 订单状态变更通知（注意：实际项目应使用订阅消息或消息推送）
    await sendOrderStatusNotification(order, status); 
    return {
      code: 200,
      message: '更新订单状态成功',
      data: {
        orderId,
        status,
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
 * @param {number} status - 订单状态码
 * @returns {string} - 订单状态文本
 */
function getOrderStatusText(status) {
  const statusMap = {
    10: '待支付',
    20: '已支付',
    30: '已发货',
    40: '已完成',
    50: '已取消',
    60: '已退款',
    70: '已取货',
  };
  return statusMap[status] || '未知状态';
}

exports.main = withResponse(handler);