const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if(event.httpMethod === "OPTIONS") return { statusCode:204, headers };
  try {
    const { _id, ...data } = event.adData
    data.create_time = db.serverDate()

    if (_id) {
      // 编辑
      await db.collection('ad_config').doc(_id).update({ data })
    } else {
      // 新增
      await db.collection('ad_config').add({ data })
    }
    return { statusCode:200, headers, body:JSON.stringify({ code: 0, msg: '保存成功', data: null }) }
  } catch (err) {
    return { statusCode:500, headers, body:JSON.stringify({ code: -1, msg: err.message, data: null }) }
  }
}