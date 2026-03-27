// 9状态全覆盖订单推送云函数（适配statusmax 1-9 · 双字段安全版）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 企业微信配置（从环境变量获取）
const CORP_ID = process.env.QY_CORP_ID || ''
const AGENT_ID = process.env.QY_AGENT_ID || ''
const SECRET = process.env.QY_SECRET || ''
const MERCHANT_USER_ID = process.env.QY_MERCHANT_USER_ID || '' // 商家企业微信userid

// ====================== 【必填】填入你的9个模板ID ======================
const TEMPLATE = {
  PAY_WAIT: 'TidkABW-BOBT9S2DFiNrymgfi1NE9N4OdlB9P_Ble24',       // 1
  ACCEPT_WAIT: 'xuGxs2flhEEoDR-Iz3KKehzAcj2ZzSHRYskI0H-6e2c',     // 2
  DELIVERY_WAIT: 'QHkuglyJklPzMcV-FvWVr5GOlORWNQaiG8XzcIF0Rx4',   // 3
  DELIVERING: '5EOwWN-HYBplYWkVrZPrkSavP9YY5OQngl0_TL82m2E',      // 4
  COMPLETED: 'LU9u4yjI-QxiR1epETFXEM0uRhNZsmI_DbwlEU9GLsI',       // 5
  CANCELLED: 'X7HCBMMFzmu4R-mGTdHXloqskQEQAo9WJIaZlATgO5Q',       // 6
  REFUND_WAIT: 'EhTpkFc7okaDaFVoMY5F8m1m_mdtDHP-OIBdIUmCQTc',     // 7
  REFUNDING: 'Pp5dOOZPKj0AyA3Us6eFevSmhZUTSF5vKxmebWQVIkQ',       // 8
  REFUNDED: 'xuGxs2flhEEoDR-Iz3KKehzAcj2ZzSHRYskI0H-6e2c'       // 9
}
// ======================================================================

// 9状态枚举（完全匹配你的系统）
const STATUS_MAX = {
  PAY_WAIT: "1",
  ACCEPT_WAIT: "2",
  DELIVERY_WAIT: "3",
  DELIVERING: "4",
  COMPLETED: "5",
  CANCELLED: "6",
  REFUND_WAIT: "7",
  REFUNDING: "8",
  REFUNDED: "9"
}

// 获取企业微信access_token
async function getQyWechatAccessToken() {
  try {
    const res = await cloud.request({
      url: `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${CORP_ID}&corpsecret=${SECRET}`,
      method: 'GET'
    })
    
    if (res.data.errcode !== 0) {
      console.error('获取企业微信access_token失败:', res.data.errmsg)
      throw new Error(res.data.errmsg)
    }
    
    return res.data.access_token
  } catch (error) {
    console.error('获取企业微信access_token异常:', error)
    throw error
  }
}

// 发送企业微信消息
async function sendQyWechatMsg(orderId, status, content) {
  if (!CORP_ID || !AGENT_ID || !SECRET || !MERCHANT_USER_ID) {
    console.log('企业微信配置不完整，跳过商家推送')
    return
  }
  
  try {
    const accessToken = await getQyWechatAccessToken()
    const messageContent = content || `订单${orderId}状态变更：${status}，请及时处理！`

    const res = await cloud.request({
      url: `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`,
      method: 'POST',
      data: {
        touser: MERCHANT_USER_ID,
        agentid: AGENT_ID,
        msgtype: 'text',
        text: {
          content: messageContent
        }
      }
    })

    if (res.data.errcode !== 0) {
      console.error('发送企业微信消息失败:', res.data.errmsg)
      return { success: false, error: res.data.errmsg }
    }

    console.log('企业微信消息发送成功')
    return { success: true }
  } catch (error) {
    console.error('企业微信消息推送异常:', error)
    return { success: false, error: error.toString() }
  }
}

// 主函数：状态变化自动推送
exports.main = async (event, context) => {
  try {
    const { doc, oldDoc } = event
    const statusmax = doc.statusmax
    const orderId = doc.order_id || doc.orderNo || doc._id?.slice(-6) || '未知订单'
    const openid = doc.openid || doc._openid || ''

    // 状态变化检查：只有当statusmax发生变化时才推送
    if (oldDoc && oldDoc.statusmax === statusmax) {
      console.log(`【推送跳过】订单${orderId}：状态未变化`)
      return { success: true, msg: '状态未变化，跳过推送' }
    }

    // ====================== 9个状态全量推送 ======================
    // 1. 待支付 → 用户
    if (statusmax === STATUS_MAX.PAY_WAIT && openid) {
      await sendMsg(openid, TEMPLATE.PAY_WAIT, '订单待支付', '请及时完成付款')
      console.log(`【用户推送】订单${orderId}：待支付`)
    }

    // 2. 待接单 → 商家
    if (statusmax === STATUS_MAX.ACCEPT_WAIT) {
      console.log(`【商家推送】订单${orderId}：待接单`)
      await sendQyWechatMsg(orderId, '待接单', `新订单${orderId}已支付，请尽快接单`) 
    }

    // 3. 待配送 → 用户 + 商家
    if (statusmax === STATUS_MAX.DELIVERY_WAIT) {
      // 用户通知
      if (openid) {
        await sendMsg(openid, TEMPLATE.DELIVERY_WAIT, '待配送', '订单已接单，准备配送')
        console.log(`【用户推送】订单${orderId}：待配送`)
      }
      // 商家通知
      console.log(`【商家推送】订单${orderId}：待配送`)
      await sendQyWechatMsg(orderId, '待配送', `订单${orderId}已接单，等待配送，请及时安排`)
    }

    // 4. 配送中 → 用户
    if (statusmax === STATUS_MAX.DELIVERING && openid) {
      await sendMsg(openid, TEMPLATE.DELIVERING, '配送中', '您的订单已出发')
      console.log(`【用户推送】订单${orderId}：配送中`)
    }

    // 5. 已完成 → 用户 + 商家
    if (statusmax === STATUS_MAX.COMPLETED) {
      // 用户通知
      if (openid) {
        await sendMsg(openid, TEMPLATE.COMPLETED, '已完成', '订单已签收')
        console.log(`【用户推送】订单${orderId}：已完成`)
      }
      // 商家通知
      console.log(`【商家推送】订单${orderId}：已完成`)
      await sendQyWechatMsg(orderId, '已完成', `订单${orderId}已完成，用户已签收`)
    }

    // 6. 已取消 → 用户 + 商家
    if (statusmax === STATUS_MAX.CANCELLED) {
      openid && await sendMsg(openid, TEMPLATE.CANCELLED, '已取消', '订单已取消')
      console.log(`【用户推送】订单${orderId}：已取消`)
      console.log(`【商家推送】订单${orderId}：已取消`)
      await sendQyWechatMsg(orderId, '已取消', `订单${orderId}已取消，请知悉`)
    }

    // 7. 待退款 → 商家
    if (statusmax === STATUS_MAX.REFUND_WAIT) {
      console.log(`【商家推送】订单${orderId}：待退款`)
      await sendQyWechatMsg(orderId, '待退款', `订单${orderId}申请退款，等待处理，请及时审核`)
    }

    // 8. 退款中 → 用户 + 商家
    if (statusmax === STATUS_MAX.REFUNDING) {
      openid && await sendMsg(openid, TEMPLATE.REFUNDING, '退款中', '退款处理中')
      console.log(`【用户推送】订单${orderId}：退款中`)
      console.log(`【商家推送】订单${orderId}：退款中`)
      await sendQyWechatMsg(orderId, '退款中', `订单${orderId}正在退款处理中，请知悉`)
    }

    // 9. 退款成功 → 用户 + 商家
    if (statusmax === STATUS_MAX.REFUNDED) {
      // 用户通知
      if (openid) {
        await sendMsg(openid, TEMPLATE.REFUNDED, '退款成功', '资金已原路返回')
        console.log(`【用户推送】订单${orderId}：退款成功`)
      }
      // 商家通知
      console.log(`【商家推送】订单${orderId}：退款成功`)
      await sendQyWechatMsg(orderId, '退款成功', `订单${orderId}退款成功，已通知用户`)
    }

    return { success: true, msg: '9状态推送执行完成' }
  } catch (err) {
    console.error('推送失败', err)
    return { success: false, error: err.toString() }
  }
}

// 统一发送小程序订阅消息（通用函数，不用改）
async function sendMsg(openid, templateId, thing1, thing2) {
  return await cloud.openapi.subscribeMessage.send({
    touser: openid,
    templateId: templateId,
    data: {
      thing1: { value: thing1 },
      thing2: { value: thing2 }
    }
  })
}