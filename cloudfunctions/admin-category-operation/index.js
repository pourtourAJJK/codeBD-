const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 分类管理：增删改查
exports.main = async (event, context) => {
  const { action, data, _id } = event

  try {
    switch (action) {
      // 添加分类
      case 'add':
        return await db.collection('shop_category').add({
          data: {
            name: data.name,
            code: data.code,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

      // 编辑分类
      case 'update':
        return await db.collection('shop_category').doc(_id).update({
          data: {
            name: data.name,
            code: data.code,
            updatedAt: new Date()
          }
        })

      // 删除分类
      case 'delete':
        return await db.collection('shop_category').doc(_id).remove()

      default:
        return { code: 400, message: '无效操作' }
    }
  } catch (err) {
    return { code: 500, message: err.message }
  }
}