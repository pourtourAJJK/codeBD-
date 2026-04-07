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
    const { _id } = event
    await db.collection('ad_config').doc(_id).remove()
    return { statusCode:200, headers, body:JSON.stringify({ code: 0, msg: '删除成功', data: null }) }
  } catch (err) {
    return { statusCode:500, headers, body:JSON.stringify({ code: -1, msg: err.message, data: null }) }
  }
}