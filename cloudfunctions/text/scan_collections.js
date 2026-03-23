const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function scanCollections(orderNo) {
  try {
    // 获取所有集合
    console.log('正在获取所有集合...');
    const colls = await db.getCollections();
    console.log('当前环境所有集合：', colls.data.map(c => c.name));
    
    // 遍历所有集合查询订单
    console.log('\n正在遍历所有集合查询订单...');
    let found = false;
    
    for (const name of colls.data.map(c => c.name)) {
      try {
        console.log(`查询集合: ${name}`);
        // 尝试多种字段名匹配
        const res1 = await db.collection(name).where({ orderNo: orderNo }).get();
        if (res1.data.length > 0) {
          console.log('🎉 订单找到！集合：', name, '字段：orderNo');
          console.log('订单数据：', res1.data[0]);
          found = true;
          return { found: true, collection: name, field: 'orderNo', data: res1.data[0] };
        }
        
        const res2 = await db.collection(name).where({ order_id: orderNo }).get();
        if (res2.data.length > 0) {
          console.log('🎉 订单找到！集合：', name, '字段：order_id');
          console.log('订单数据：', res2.data[0]);
          found = true;
          return { found: true, collection: name, field: 'order_id', data: res2.data[0] };
        }
        
        const res3 = await db.collection(name).where({ out_trade_no: orderNo }).get();
        if (res3.data.length > 0) {
          console.log('🎉 订单找到！集合：', name, '字段：out_trade_no');
          console.log('订单数据：', res3.data[0]);
          found = true;
          return { found: true, collection: name, field: 'out_trade_no', data: res3.data[0] };
        }
      } catch (e) {
        console.log(`集合 ${name} 查询失败:`, e.message);
      }
    }
    
    if (!found) {
      console.log('❌ 订单在当前环境不存在');
      return { found: false, message: '订单在当前环境不存在' };
    }
  } catch (error) {
    console.error('扫描失败:', error);
    return { found: false, message: error.message };
  }
}

// 导出函数以便其他模块调用
async function main(event) {
  const { orderNo } = event;
  if (!orderNo) {
    return { code: 400, message: '缺少订单号', data: {} };
  }
  
  const result = await scanCollections(orderNo);
  return {
    code: result.found ? 200 : 404,
    message: result.found ? '订单查询成功' : result.message || '订单未找到',
    data: result
  };
}

exports.main = main;