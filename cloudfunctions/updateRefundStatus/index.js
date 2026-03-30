const cloud = require('wx-server-sdk');
const { withResponse } = require('../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const handler = async (event, context) => {
  const { openid, orderId, status } = event;
  
  try {
    // 这里可以通过WebSocket或其他方式通知客户端更新缓存
    // 简化方案：直接返回状态更新信息
    
    return {
      code: 200,
      message: '退款状态已更新',
      data: { orderId, status }
    };
  } catch (error) {
    console.error('更新退款状态失败:', error);
    return {
      code: 500,
      message: '更新退款状态失败',
      data: { orderId, status }
    };
  }
};

exports.main = withResponse(handler);