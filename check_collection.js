// 检查并创建正确的addresses集合
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init();

const db = cloud.database();

async function checkAndCreateCollection() {
  try {
    console.log('=== 检查addresses集合 ===');
    
    // 检查addresses集合是否存在
    try {
      const addressesCount = await db.collection('addresses').count();
      console.log('✅ addresses集合已存在，当前记录数:', addressesCount.total);
    } catch (error) {
      // 如果addresses集合不存在，尝试创建
      if (error.errCode === -502005) {
        console.log('⚠️  addresses集合不存在，正在创建...');
        await db.createCollection('addresses');
        console.log('✅ addresses集合创建成功');
        
        // 创建openid索引
        await db.collection('addresses').createIndex({ openid: 1 }).catch(() => console.log('地址集合openid索引已存在'));
        console.log('✅ addresses集合openid索引创建成功');
      } else {
        throw error;
      }
    }
    
    console.log('\n=== 检查user_addresses集合 ===');
    
    // 检查user_addresses集合是否存在
    try {
      const userAddressesCount = await db.collection('user_addresses').count();
      console.log('ℹ️  user_addresses集合已存在，当前记录数:', userAddressesCount.total);
      console.log('⚠️  注意：实际使用的是addresses集合，user_addresses集合可能是多余的');
    } catch (error) {
      console.log('ℹ️  user_addresses集合不存在');
    }
    
    console.log('\n=== 检查完成 ===');
    console.log('现在可以尝试获取地址列表了');
    
  } catch (error) {
    console.error('❌ 操作出错:', error);
  }
}

// 执行检查和创建
checkAndCreateCollection();