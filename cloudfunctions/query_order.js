const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function queryOrder(orderNo) {
  try {
    console.log(`查询订单：${orderNo}`);
    const result = await db.collection('shop_order')
      .where({
        $or: [
          { order_no: orderNo },
          { out_trade_no: orderNo },
          { order_id: orderNo },
          { orderNo: orderNo }
        ]
      })
      .get();

    console.log('=== 目标订单完整数据 ===');
    if (result.data.length === 0) {
      console.log('❌ 数据库中未找到该订单');
      return { found: false, message: '数据库中未找到该订单' };
    } else {
      console.log(JSON.stringify(result.data[0], null, 2));
      console.log('✅ 找到订单，pay_status 实际值：', result.data[0].pay_status);
      console.log('✅ 订单状态 status：', result.data[0].status);
      return { found: true, data: result.data[0] };
    }
  } catch (error) {
    console.error('查询失败:', error);
    return { found: false, message: error.message };
  }
}

// 导出函数以便其他模块调用
async function main(event) {
  const { orderNo } = event;
  if (!orderNo) {
    return { code: 400, message: '缺少订单号', data: {} };
  }
  
  const result = await queryOrder(orderNo);
  return {
    code: result.found ? 200 : 404,
    message: result.found ? '订单查询成功' : result.message || '订单未找到',
    data: result
  };
}

// 如果直接运行，查询默认订单
if (require.main === module) {
  const orderNo = process.argv[2] || 'FX202603201658553209840';
  queryOrder(orderNo);
}

exports.main = main;