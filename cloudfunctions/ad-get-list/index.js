const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 统一返回格式：{code,msg,data}
exports.main = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if(event.httpMethod === "OPTIONS") return { statusCode:204, headers };
  try {
    // 1. 接收前端传的 token
    const { adminToken, type = 'active' } = event

    // 2. 没有 token → 直接返回空（权限拦截）
    if (!adminToken && type === 'all') {
      return { statusCode:200, headers, body:JSON.stringify({ code: -1, msg: '未登录', data: [] }) }
    }

    // 3. 有权限 → 查询数据库
    let query = db.collection('ad_config')
    
    if (type === 'active') {
      query = query.where({ is_active: true })
    }
    
    const res = await query.orderBy('create_time', 'desc').get()
    return { statusCode:200, headers, body:JSON.stringify({ code: 0, msg: '获取成功', data: res.data }) }
  } catch (err) {
    return { statusCode:500, headers, body:JSON.stringify({ code: -1, msg: err.message, data: [] }) }
  }
}