const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if(event.httpMethod === "OPTIONS") return { statusCode:204, headers };
  try {
    // 1. 接收前端传的 token
    const { adminToken, _id } = event

    // 2. 没有 token → 直接返回空（权限拦截）
    if (!adminToken) {
      return { statusCode:200, headers, body:JSON.stringify({ code: -1, msg: '未登录', data: null }) }
    }

    // 3. 有权限 → 操作数据库
    await db.collection('ad_config').doc(_id).remove()
    return { statusCode:200, headers, body:JSON.stringify({ code: 0, msg: '删除成功', data: null }) }
  } catch (err) {
    return { statusCode:500, headers, body:JSON.stringify({ code: -1, msg: err.message, data: null }) }
  }
}