// 管理员订单更新云函数
const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库实例
const db = cloud.database();
const _ = db.command;

/**
 * 管理员更新订单
 * @param {Object} event - 事件参数
 * @param {string} event.orderId - 订单ID
 * @param {string} event.status - 订单状态
 * @param {Object} event.additionalData - 其他更新数据
 * @returns {Object} - 更新结果
 */
const handler = async (event, context) => {
  try {
    const { orderId, status, additionalData = {} } = event;
    
    // 参数验证
    if (!orderId) {
      return {
        code: 400,
        message: '订单ID不能为空',
        data: null
      };
    }
    
    // 构建更新数据
    const updateData = {
      updatedAt: db.serverDate()
    };
    
    // 更新状态
    if (status) {
      updateData.status = status;
    }
    
    // 添加其他更新数据
    Object.assign(updateData, additionalData);
    
    // 更新订单
    const updateResult = await db.collection('shop_order')
      .where({ order_id: orderId })
      .update({ data: updateData });
    
    if (updateResult.stats && updateResult.stats.updated > 0) {
      return {
        code: 200,
        message: '更新订单成功',
        data: {
          success: true,
          message: '订单更新成功',
          orderId,
          status
        }
      };
    } else {
      return {
        code: 404,
        message: '订单不存在或更新失败',
        data: {
          success: false,
          message: '订单不存在或更新失败'
        }
      };
    }
  } catch (error) {
    console.error('更新订单失败:', error);
    return {
      code: 500,
      message: '更新订单失败，请稍后重试',
      data: {
        success: false,
        message: '更新订单失败'
      }
    };
  }
};

exports.main = handler;