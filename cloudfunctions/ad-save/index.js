const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
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
    return { code: 0, msg: '保存成功', data: null }
  } catch (err) {
    return { code: -1, msg: err.message, data: null }
  }
}