const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

// 一个函数搞定：绑定 / 解绑
exports.main = async (event) => {
  const { type, admin_id, openid } = event

  // 校验参数
  if (!type || !admin_id) {
    return { success: false, message: '参数缺失' }
  }

  try {
    // ============== 1. 绑定微信 ==============
    if (type === 'bind') {
      if (!openid) return { success: false, message: '缺少openid' }
      // 旧记录设为 已解绑(2)
      await db.collection('admin_wechat').where({
        admin_id,
        adminstatus: "1"
      }).update({ data: { adminstatus: "2" } })
      // 新增绑定记录(1=已绑定)
      await db.collection('admin_wechat').add({
        data: {
          admin_id,
          openid,
          bind_time: new Date(),
          adminstatus: "1"
        }
      })
      return { success: true }
    }

    // ============== 2. 解绑微信 ==============
    if (type === 'unbind') {
      await db.collection('admin_wechat').where({
        admin_id,
        adminstatus: "1"
      }).update({ data: { adminstatus: "2" } })
      return { success: true }
    }

    return { success: false, message: '无效操作类型' }
  } catch (e) {
    return { success: false, message: e.message }
  }
}