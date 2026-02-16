// 检查订单字段名的云函数
const cloud = require('wx-server-sdk');

const { withResponse } = require('../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

const handler = async (event, context) => {
  try {
    console.log('=== 开始检查订单字段名 ===');

    // 查询所有订单，限制数量为10条
    const orderResult = await db.collection('shop_order').limit(10).get();

    console.log(`查询到 ${orderResult.data.length} 条订单`);

    if (orderResult.data.length === 0) {
      return {
        code: 500,
        message: '数据库中没有订单数据',
        data: {}
      };
    }

    // 检查每一个订单的字段名
    const orderFields = [];
    orderResult.data.forEach((order, index) => {
      console.log(`\n订单${index + 1}的字段`);
      console.log('所有字段:', Object.keys(order));
      console.log('openid字段:', order.openid);
      console.log('order_id:', order.order_id);
      console.log('status:', order.status);

      orderFields.push({
        order_id: order.order_id,
        hasOpenid: !!order.openid,
        openidValue: order.openid,
        status: order.status,
        allFields: Object.keys(order)
      });
    });

    return {
      code: 200,
      message: '检查成功',
      data: {
        totalOrders: orderResult.data.length,
        orderFields: orderFields
      }
    };

  } catch (error) {
    console.error('检查订单字段名失败:', error);
    return {
      code: 500,
      message: '检查失败',
      data: { error: error.message }
    };
  }
};

exports.main = withResponse(handler);
