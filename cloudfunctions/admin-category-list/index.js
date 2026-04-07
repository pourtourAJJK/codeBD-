// 管理员分类列表云函数
const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库实例
const db = cloud.database();
const _ = db.command;

/**
 * 管理员查询分类列表
 * @param {Object} event - 事件参数
 * @param {number} event.pageSize - 每页数量，默认100
 * @returns {Object} - 分类列表结果
 */
const handler = async (event, context) => {
  // 必须加的跨域配置
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // OPTIONS 预检请求直接返回成功
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  try {
    const { pageSize = 100 } = event;
    
    // 查询所有分类
    const categoriesRes = await db.collection('shop_category')
      .limit(pageSize)
      .get();
    
    const categories = categoriesRes.data.map(category => ({
      _id: category._id,
      name: category.name || '',
      code: category.code || '',
      create_time: category.createTime || category.createdAt
    }));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        code: 200,
        message: '获取分类列表成功',
        data: {
          records: categories,
          total: categories.length
        }
      })
    };
  } catch (error) {
    console.error('获取分类列表失败:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        code: 500,
        message: '获取分类列表失败，请稍后重试',
        data: null
      })
    };
  }
};

exports.main = handler;