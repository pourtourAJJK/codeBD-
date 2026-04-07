const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 分类管理：增删改查
exports.main = async (event, context) => {
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

  const { action, data, _id } = event

  try {
    let result;
    switch (action) {
      // 添加分类
      case 'add':
        result = await db.collection('shop_category').add({
          data: {
            name: data.name,
            code: data.code,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            code: 0,
            message: '添加分类成功',
            data: result
          })
        };

      // 编辑分类
      case 'update':
        result = await db.collection('shop_category').doc(_id).update({
          data: {
            name: data.name,
            code: data.code,
            updatedAt: new Date()
          }
        });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            code: 0,
            message: '编辑分类成功',
            data: result
          })
        };

      // 删除分类
      case 'delete':
        result = await db.collection('shop_category').doc(_id).remove();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            code: 0,
            message: '删除分类成功',
            data: result
          })
        };

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            code: 400,
            message: '无效操作',
            data: null
          })
        };
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        code: 500,
        message: err.message,
        data: null
      })
    };
  }
}