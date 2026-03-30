const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 批量删除商品云函数
exports.main = async (event) => {
  const { productIds } = event // 接收前端传入的商品ID数组
  try {
    const deleteResults = await Promise.all(
      productIds.map(productId =>
        db.collection('shop_spu').doc(productId).remove() // 删除单条商品
      )
    )
    return {
      success: true,
      message: `成功删除 ${deleteResults.length} 个商品`,
      data: deleteResults
    }
  } catch (err) {
    console.error("批量删除失败：", err)
    return { success: false, message: err.message }
  }
}