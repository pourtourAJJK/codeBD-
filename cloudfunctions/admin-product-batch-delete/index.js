const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 批量删除商品云函数
exports.main = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if(event.httpMethod === "OPTIONS") return { statusCode:204, headers };
  // 1. 接收前端传的 token
  const { adminToken, productIds } = event // 接收前端传入的商品ID数组

  // 2. 没有 token → 直接返回空（权限拦截）
  if (!adminToken) {
    return {
      statusCode:200,
      headers,
      body:JSON.stringify({
        code: 401,
        message: '未登录',
        data: null
      })
    };
  }

  // 3. 有权限 → 操作数据库
  try {
    const deleteResults = await Promise.all(
      productIds.map(productId =>
        db.collection('shop_spu').doc(productId).remove() // 删除单条商品
      )
    )
    return {
      statusCode:200,
      headers,
      body:JSON.stringify({
        code: 200,
        success: true,
        message: `成功删除 ${deleteResults.length} 个商品`,
        data: deleteResults
      })
    }
  } catch (err) {
    console.error("批量删除失败：", err)
    return { 
      statusCode:500,
      headers,
      body:JSON.stringify({ code: 500, success: false, message: err.message })
    }
  }
}