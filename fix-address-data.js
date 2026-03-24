const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

async function fixAddressField() {
  try {
    console.log('开始修复订单address字段格式...');
    
    // 查找所有订单
    const ordersRes = await db.collection('shop_order').get();
    const orders = ordersRes.data;
    console.log(`找到订单数量: ${orders.length}`);
    
    let fixedCount = 0;
    
    for (const order of orders) {
      try {
        // 检查address字段是否为数组
        if (order.address && !Array.isArray(order.address)) {
          // 将对象转换为数组
          const addressArray = [order.address];
          
          await db.collection('shop_order').doc(order._id).update({
            data: {
              address: addressArray
            }
          });
          
          fixedCount++;
          console.log(`修复订单成功: ${order.order_id}`);
        }
      } catch (error) {
        console.error(`修复订单失败: ${order.order_id}`, error);
      }
    }
    
    console.log(`修复完成，成功修复 ${fixedCount} 个订单`);
    return { success: true, fixedCount, totalCount: orders.length };
  } catch (error) {
    console.error('修复过程中出错:', error);
    return { success: false, error: error.message };
  }
}

// 执行修复
fixAddressField().then(result => {
  console.log('修复结果:', result);
}).catch(error => {
  console.error('修复失败:', error);
});