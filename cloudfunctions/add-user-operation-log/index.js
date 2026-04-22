// 云函数：add-user-operation-log
// 仅用于 微信小程序用户 操作日志上传（对齐数据模型版）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  // 自动获取微信小程序官方上下文（核心：用户openid、访问IP）
  const { OPENID, CLIENTIP } = cloud.getWXContext()

  try {
    // 【必填项校验】确保核心字段存在
    if (!event.operate_module || !event.operate_type) {
      throw new Error('operate_module（操作模块）和operate_type（操作类型）为必填项')
    }

    // 组装用户日志数据（严格对齐数据模型schema）
    const logData = {
      openid: OPENID, // 自动获取，无需前端传参（模型必填）
      operate_module: event.operate_module, // 模型必填（枚举：order/refund）
      operate_type: event.operate_type, // 模型必填（枚举：create_order/pay_order等）
      // 按操作模块自动赋值关联字段：订单→relation_id1，退款→relation_id2
      relation_id1: event.operate_module === 'order' ? { _id: event.relation_id } : null,
      relation_id2: event.operate_module === 'refund' ? { _id: event.relation_id } : null,
      operate_desc: event.operate_desc || '', // 操作描述（补充操作结果）
      fail_reason: event.fail_reason || '', // 失败原因（模型字段）
      // client_info转为JSON字符串（模型定义为string类型）
      client_info: event.client_info ? JSON.stringify(event.client_info) : '',
      ip: CLIENTIP, // 自动获取用户IP（模型字段）
      // 系统字段：createdAt/updatedAt由数据库自动生成，无需手动赋值
    }

    // 写入日志（永久存储，不可篡改）
    await db.collection('user_operation_logs').add({ data: logData })

    // 日志上传成功，不影响主业务
    return { code: 200, message: '用户日志上传成功' }
  } catch (err) {
    // 日志失败不阻塞业务，仅打印错误
    console.error('用户日志上传失败', err)
    return { code: 500, message: '日志上传失败', error: err.message }
  }
}
