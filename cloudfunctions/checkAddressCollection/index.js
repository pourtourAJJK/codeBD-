// 检查并创建addresses集合的云函数
const cloud = require('wx-server-sdk');
const { withResponse } = require('../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const handler = async (event, context) => {
  try {
    console.log('=== 检查shop_address集合 ===');
    
    // 检查shop_address集合是否存在
    try {
      const addressesCount = await db.collection('shop_address').count();
      console.log('✅ shop_address集合已存在，当前记录数:', addressesCount.total);
    } catch (error) {
      // 如果shop_address集合不存在，尝试创建
      if (error.errCode === -502005) {
        console.log('⚠️  shop_address集合不存在，正在创建...');
        await db.createCollection('shop_address');
        console.log('✅ shop_address集合创建成功');
        
        // 创建openid索引
        await db.collection('shop_address').createIndex({ openid: 1 }).catch(() => console.log('地址集合openid索引已存在'));
        console.log('✅ shop_address集合openid索引创建成功');
      } else {
        throw error;
      }
    }
    
    console.log('\n=== 检查完成==');
    
    return {
      success: true,
      message: 'shop_address集合检查和创建成功',
      data: {}
    };
    

  } catch (error) {
    console.error('❌ 操作出错:', error);
    return {
      success: false,
      message: '集合检查和创建失败',
      error: error.message
    };
  }
};

exports.main = withResponse(handler);
