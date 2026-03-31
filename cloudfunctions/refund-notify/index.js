const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 微信退款结果回调云函数
exports.main = async (event, context) => {
  try {
    // 1. 获取微信回调的退款结果（固定格式）
    const refundData = event.body
    const out_refund_no = refundData.out_refund_no // 退款单号
    const refund_status = refundData.refund_status // 退款状态：SUCCESS/FAIL

    console.log("微信退款回调", refundData)

    // 2. 根据退款单号查询对应的退款单
    const refundRes = await db.collection('shop_refund').where({
      out_refund_no: out_refund_no
    }).get()
    if (refundRes.data.length === 0) {
      return { code: 400, msg: "退款单不存在" }
    }
    const refundInfo = refundRes.data[0]
    const order_id = refundInfo.order_id

    // 3. 根据退款结果更新状态
    let refund_status_text, refund_result_text, orderStatus
    if (refund_status === "SUCCESS") {
      // 退款成功
      refund_status_text = "退款成功"
      refund_result_text = "退款成功"
      orderStatus = "9" // 订单状态：已退款
    } else {
      // 退款失败
      refund_status_text = "退款失败"
      refund_result_text = "退款失败"
      orderStatus = "8" // 订单状态：退款失败
    }

    // 4. 更新 shop_refund 退款表状态
    await db.collection('shop_refund').doc(refundInfo._id).update({
      data: {
        refund_status: refund_status_text,
        refund_result_status: refund_result_text,
        refund_time: new Date(),
        update_time: new Date().toISOString()
      }
    })

    // 5. 同步更新 shop_order 订单状态
    await db.collection('shop_order').where({
      order_id: order_id
    }).update({
      data: {
        statusmax: orderStatus,
        update_time: new Date().toISOString()
      }
    })

    // 6. 返回微信成功标识（必须返回，否则微信会重复回调）
    return {
      code: 200,
      msg: "成功",
      data: "SUCCESS"
    }

  } catch (err) {
    console.error("退款回调异常", err)
    return { code: 500, msg: "失败" }
  }
}
