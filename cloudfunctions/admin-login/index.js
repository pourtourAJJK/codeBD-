// 管理员登录云函数
const cloud = require('wx-server-sdk');

const { withResponse } = require('../utils/response');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库实例
const db = cloud.database();
const _ = db.command;

/**
 * 管理员登录云函数
 * @param {Object} event - 事件参数
 * @param {string} event.username - 管理员用户名
 * @param {string} event.password - 管理员密码
 * @returns {Object} - 登录结果
 */
const handler = async (event, context) => {
  try {
    const { username, password } = event;
    
    // 参数验证
    if (!username || !password) {
      return {
        code: 400,
        message: '账号和密码不能为空',
        data: null
      };
    }
    
    // 查询管理员信息
    const adminRes = await db.collection('admin_user').where({
      username: username
    }).get();
    
    if (adminRes.data.length === 0) {
      return {
        code: 401,
        message: '账号不存在',
        data: null
      };
    }
    
    const admin = adminRes.data[0];
    
    // 验证密码（注意：实际项目应使用密码加密存储）
    if (admin.password !== password) {
      return {
        code: 401,
        message: '密码错误',
        data: null
      };
    }
    
    // 生成token（注意：实际项目应使用JWT等安全方式）
    const token = `${admin._id}_${Date.now()}`;
    
    // 更新管理员登录信息
    await db.collection('admin_user').doc(admin._id).update({
      data: {
        lastLoginTime: db.serverDate(),
        token: token
      }
    });
    
    // 记录登录日志
    await db.collection('adminLoginLogs').add({
      data: {
        adminId: admin._id,
        username: admin.username,
        loginTime: db.serverDate(),
        ip: context.CLIENTIP || 'unknown',
        userAgent: context.CLIENTUA || 'unknown'
      }
    });
    
    return {
      code: 200,
      message: '登录成功',
      data: {
        adminId: admin._id,
        username: admin.username,
        nickname: admin.nickname,
        token: token,
        role: admin.role
      }
    };
  } catch (error) {
    console.error('管理员登录失败', error);
    return {
      code: 500,
      message: '登录失败，请稍后重试',
      data: null
    };
  }
};

exports.main = withResponse(handler);
