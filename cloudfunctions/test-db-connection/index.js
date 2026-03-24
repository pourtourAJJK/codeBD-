const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function testDbConnection() {
  try {
    console.log('开始测试数据库连接...');
    
    // 测试获取所有集合
    const collections = await db.getCollections();
    console.log('数据库集合列表:', collections.data.map(c => c.name));
    
    // 测试查询shop_order集合
    console.log('\n测试查询shop_order集合...');
    const orderRes = await db.collection('shop_order').limit(5).get();
    console.log('查询到订单数量:', orderRes.data.length);
    
    if (orderRes.data.length > 0) {
      console.log('订单示例:', orderRes.data[0]);
    }
    
    // 测试查询特定订单
    console.log('\n测试查询特定订单...');
    const targetOrderRes = await db.collection('shop_order').where({
      orderNo: 'FX202603230227368324566'
    }).get();
    console.log('目标订单查询结果:', targetOrderRes.data);
    
    return {
      code: 200,
      message: '数据库连接测试成功',
      data: {
        collections: collections.data.map(c => c.name),
        orderCount: orderRes.data.length,
        targetOrderFound: targetOrderRes.data.length > 0
      }
    };
  } catch (error) {
    console.error('数据库连接测试失败:', error);
    return {
      code: 500,
      message: '数据库连接测试失败',
      data: { error: error.message }
    };
  }
}

exports.main = testDbConnection;