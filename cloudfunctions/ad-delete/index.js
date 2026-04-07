const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { _id } = event
    await db.collection('ad_config').doc(_id).remove()
    return { code: 0, msg: '删除成功', data: null }
  } catch (err) {
    return { code: -1, msg: err.message, data: null }
  }
}