const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 统一返回格式：{code,msg,data}
exports.main = async (event, context) => {
  try {
    // type=active：小程序获取启用的广告；type=all：React获取全部广告
    const { type = 'active' } = event
    let query = db.collection('ad_config')
    
    if (type === 'active') {
      query = query.where({ is_active: true })
    }
    
    const res = await query.orderBy('create_time', 'desc').get()
    return { code: 0, msg: '获取成功', data: res.data }
  } catch (err) {
    return { code: -1, msg: err.message, data: [] }
  }
}