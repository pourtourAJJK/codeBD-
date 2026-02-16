// 检查addresses集合是否存在并添加测试数据
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init();

const db = cloud.database();

async function checkAndTestAddresses() {
  try {
    console.log('检查addresses集合是否存在...');
    
    // 尝试获取集合信息
    const result = await db.collection('addresses').count();
    console.log('addresses集合存在，当前记录数:', result.total);
    
    // 获取当前用户的openid
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    console.log('当前用户openid:', openid);
    
    // 尝试添加一条测试地址
    console.log('尝试添加一条测试地址...');
    const addResult = await db.collection('addresses').add({
      data: {
        openid: openid,
        name: '测试用户',
        phone: '13800138000',
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        detail: '科技园路1号',
        isDefault: false,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });
    
    console.log('✅ 添加测试地址成功:', addResult);
    
    // 尝试查询地址列表
    console.log('尝试查询地址列表...');
    const queryResult = await db.collection('addresses').where({
      openid: openid
    }).get();
    
    console.log('✅ 查询地址列表成功，共找到', queryResult.data.length, '条记录');
    console.log('地址列表:', queryResult.data);
    
  } catch (error) {
    console.error('❌ 操作出错:', error);
  }
}

// 执行检查
checkAndTestAddresses();