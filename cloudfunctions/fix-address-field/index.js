const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const ORDER_COLLECTION = 'shop_order';

/**
 * 批量修复订单address字段格式
 * 将对象类型的address转换为数组类型
 */
const handler = async (event, context) => {
  try {
    console.log('开始修复订单address字段格式...');
    
    // 查找所有address字段不是数组的订单
    const ordersRes = await db.collection(ORDER_COLLECTION)
      .where({
        address: _.not(_.and([
          _.type('array')
        ]))
      })
      .get();
    
    const orders = ordersRes.data;
    console.log(`找到需要修复的订单数量: ${orders.length}`);
    
    if (orders.length === 0) {
      return {
        code: 200,
        message: '没有需要修复的订单',
        data: {
          fixedCount: 0
        }
      };
    }
    
    // 批量修复订单
    let fixedCount = 0;
    for (const order of orders) {
      try {
        if (order.address) {
          // 将对象转换为数组
          const addressArray = Array.isArray(order.address) ? order.address : [order.address];
          
          await db.collection(ORDER_COLLECTION).doc(order._id).update({
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
    
    return {
      code: 200,
      message: '订单address字段格式修复完成',
      data: {
        totalCount: orders.length,
        fixedCount
      }
    };
  } catch (error) {
    console.error('修复订单address字段格式失败', error);
    return {
      code: 500,
      message: '修复订单address字段格式失败',
      data: null
    };
  }
};

exports.main = handler;