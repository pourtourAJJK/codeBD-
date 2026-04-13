// 云函数：admin-return-detail
// 功能：根据退款ID查询单条退款详情（适配退款详情页）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  console.log("[退款详情云函数] 接收参数：", event)
  // 1. 接收前端传的 token
  const { adminToken, id } = event

  // 2. 没有 token → 直接返回空（权限拦截）
  if (!adminToken) {
    return {
      code: 401,
      message: "未登录",
      data: null
    }
  }

  // 3. 参数校验
  if (!id) {
    return {
      code: 400,
      message: "参数错误：缺少退款ID",
      data: null
    }
  }

  try {
    // 4. 有权限 → 查询数据库
    // 根据ID查询 shop_refund 表（你的退款数据表）
    const detailRes = await db.collection("shop_refund").doc(id).get()
    console.log("[退款详情云函数] 查询结果：", detailRes.data)

    // 5. 返回完整数据（包含你所有数据库字段）
    return {
      code: 200,
      message: "获取退款详情成功",
      data: detailRes.data
    }

  } catch (err) {
    console.error("[退款详情云函数] 查询失败：", err)
    return {
      code: 500,
      message: "获取退款详情失败：" + err.message,
      data: null
    }
  }
}