// 初始化管理员账号云函数
const cloud = require('wx-server-sdk');
const bcrypt = require('bcryptjs');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库实例
const db = cloud.database();

/**
 * 初始化管理员账号
 * 创建默认管理员账号，密码加密存储
 */
const handler = async (event, context) => {
  try {
    // 检查是否已存在管理员账号
    const adminRes = await db.collection('admin_user').get();
    
    if (adminRes.data.length > 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          code: 200,
          message: '管理员账号已存在',
          data: null
        })
      };
    }
    
    // 生成加密密码
    const password = 'admin123'; // 默认密码，建议登录后修改
    const salt = bcrypt.genSaltSync(10);
    const encryptedPassword = bcrypt.hashSync(password, salt);
    
    // 创建默认管理员账号
    const result = await db.collection('admin_user').add({
      data: {
        account: 'admin',
        phone: '13800138000',
        is_enable: true,
        role: 'super_admin',
        password: encryptedPassword,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        code: 200,
        message: '管理员账号初始化成功',
        data: {
          adminId: result.id,
          account: 'admin',
          password: password // 仅在初始化时返回，生产环境应删除
        }
      })
    };
  } catch (error) {
    console.error('初始化管理员账号失败', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        code: 500,
        message: '初始化失败，请稍后重试',
        data: null
      })
    };
  }
};

exports.main = handler;