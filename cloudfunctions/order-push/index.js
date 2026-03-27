// 9状态全覆盖订单推送云函数（适配statusmax 1-9 · 双字段安全版）
const cloud = require('wx-server-sdk')
const https = require('https'); // 引入原生https模块
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV, traceUser: true })

// 企业微信配置（从环境变量获取）
const CORP_ID = process.env.QY_CORP_ID || ''
const AGENT_ID = process.env.QY_AGENT_ID || ''
const SECRET = process.env.QY_SECRET || ''
const MERCHANT_USER_ID = process.env.QY_MERCHANT_USER_ID || '' // 商家企业微信userid

// ====================== 【必填】填入你的9个模板ID ======================
const TEMPLATE = {
  PAY_WAIT: 'TidkABW-BOBT9S2DFiNrymgfi1NE9N4OdlB9P_Ble24',       // 1
  ACCEPT_WAIT: 'tcx84nJdQzUpCE7P16sd4oxf88hGoMvwAM3_p65l2qM',     // 2
  DELIVERY_WAIT: 'QHkuglyJklPzMcV-FvWVr5GOlORWNQaiG8XzcIF0Rx4',   // 3
  DELIVERING: '5EOwWN-HYBplYWkVrZPrkSavP9YY5OQngl0_TL82m2E',      // 4
  COMPLETED: 'LU9u4yjI-QxiR1epETFXEM0uRhNZsmI_DbwlEU9GLsI',       // 5
  CANCELLED: 'X7HCBMMFzmu4R-mGTdHXloqskQEQAo9WJIaZlATgO5Q',       // 6
  REFUND_WAIT: 'EhTpkFc7okaDaFVoMY5F8m1m_mdtDHP-OIBdIUmCQTc',     // 7
  REFUNDING: 'Pp5dOOZPKj0AyA3Us6eFevSmhZUTSF5vKxmebWQVIkQ',       // 8
  REFUNDED: 'xuGxs2flhEEoDR-Iz3KKehzAcj2ZzSHRYskI0H-6e2c'       // 9
}
// ==================================================================

// 🔥 模板字段映射表（每个模板ID对应其字段列表）
const TEMPLATE_MAP = {
  // 1. 待付款提醒（模板ID：TidkABW-BOBT9S2DFiNrymgfi1NE9N4OdlB9P_Ble24）
  "TidkABW-BOBT9S2DFiNrymgfi1NE9N4OdlB9P_Ble24": ["character_string4", "thing2", "thing3", "thing16", "thing12"],
  
  // 2. 新订单提醒（模板ID：tcx84nJdQzUpCE7P16sd4oxf88hGoMvwAM3_p65l2qM）
  "tcx84nJdQzUpCE7P16sd4oxf88hGoMvwAM3_p65l2qM": ["thing2", "amount3", "time28", "thing10", "thing11"],
  
  // 3. 待发货通知（模板ID：QHkuglyJklPzMcV-FvWVr5GOlORWNQaiG8XzcIF0Rx4）
  "QHkuglyJklPzMcV-FvWVr5GOlORWNQaiG8XzcIF0Rx4": ["character_string1", "thing6", "amount2", "thing5", "thing4"],
  
  // 4. 商品配送通知（模板ID：5EOwWN-HYBplYWkVrZPrkSavP9YY5OQngl0_TL82m2E）
  "5EOwWN-HYBplYWkVrZPrkSavP9YY5OQngl0_TL82m2E": ["character_string9", "time3", "thing1", "number2", "thing8"],
  
  // 5. 订单已完成通知（模板ID：LU9u4yjI-QxiR1epETFXEM0uRhNZsmI_DbwlEU9GLsI）
  "LU9u4yjI-QxiR1epETFXEM0uRhNZsmI_DbwlEU9GLsI": ["character_string10", "thing3", "number15", "time19", "thing1"],
  
  // 6. 订单取消通知（模板ID：X7HCBMMFzmu4R-mGTdHXloqskQEQAo9WJIaZlATgO5Q）
  "X7HCBMMFzmu4R-mGTdHXloqskQEQAo9WJIaZlATgO5Q": ["character_string20", "thing6", "thing1", "date2", "thing4"],
  
  // 7. 申请退款通知（模板ID：EhTpkFc7okaDaFVoMY5F8m1m_mdtDHP-OIBdIUmCQTc）
  "EhTpkFc7okaDaFVoMY5F8m1m_mdtDHP-OIBdIUmCQTc": ["character_string4", "thing1", "thing10", "date5", "thing8"],
  
  // 8. 退款审核通知（模板ID：Pp5dOOZPKj0AyA3Us6eFevSmhZUTSF5vKxmebWQVIkQ）
  "Pp5dOOZPKj0AyA3Us6eFevSmhZUTSF5vKxmebWQVIkQ": ["character_string7", "thing2", "amount3", "thing8", "time4"],
  
  // 9. 退款成功通知（模板ID：xuGxs2flhEEoDR-Iz3KKehzAcj2ZzSHRYskI0H-6e2c）
  "xuGxs2flhEEoDR-Iz3KKehzAcj2ZzSHRYskI0H-6e2c": ["character_string4", "thing10", "thing11", "time12", "phrase8"]
};

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
function getQyWechatAccessToken() {
  return new Promise((resolve, reject) => {
    // 从环境变量获取企业微信配置
    const corpid = CORP_ID;
    const corpsecret = SECRET;
    
    if (!corpid || !corpsecret) {
      reject(new Error('企业微信配置不完整'));
      return;
    }
    
    const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpid}&corpsecret=${corpsecret}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.access_token) {
            resolve(result.access_token);
          } else {
            console.error('获取企业微信access_token失败:', result.errmsg);
            reject(result);
          }
        } catch (e) {
          console.error('解析企业微信响应失败:', e);
          reject(e);
        }
      });
    }).on('error', (e) => {
      console.error('获取企业微信access_token网络错误:', e);
      reject(e);
    });
  });
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

    // 使用原生https模块发送POST请求
    const postData = JSON.stringify({
      touser: MERCHANT_USER_ID,
      agentid: AGENT_ID,
      msgtype: 'text',
      text: {
        content: messageContent
      }
    });

    const options = {
      hostname: 'qyapi.weixin.qq.com',
      path: `/cgi-bin/message/send?access_token=${accessToken}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.errcode !== 0) {
              console.error('发送企业微信消息失败:', result.errmsg);
              resolve({ success: false, error: result.errmsg });
            } else {
              console.log('企业微信消息发送成功');
              resolve({ success: true });
            }
          } catch (e) {
            console.error('解析企业微信响应失败:', e);
            resolve({ success: false, error: e.toString() });
          }
        });
      });

      req.on('error', (e) => {
        console.error('发送企业微信消息网络错误:', e);
        resolve({ success: false, error: e.toString() });
      });

      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.error('企业微信消息推送异常:', error)
    return { success: false, error: error.toString() }
  }
}

// 🔥 动态组装模板数据
function buildTemplateData(templateId, dataValues) {
  const templateData = {};
  const fieldNames = TEMPLATE_MAP[templateId];
  if (!fieldNames) {
    throw new Error(`模板ID ${templateId} 未在TEMPLATE_MAP中配置`);
  }
  fieldNames.forEach((field, index) => {
    templateData[field] = { value: dataValues[index] || '' };
  });
  return templateData;
}

// 主函数：状态变化自动推送
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  try {
    // ====================== 处理前端直接调用（订阅授权确认）======================
    if (event.type === 'subscribe') {
      const { templateId, orderId, dataValues } = event;
      
      // 校验模板是否配置
      if (!TEMPLATE_MAP[templateId]) {
        return {
          success: false,
          error: `模板ID ${templateId} 未配置，请先在TEMPLATE_MAP中添加`,
          errCode: -1
        };
      }

      // 动态组装模板数据
      const templateData = buildTemplateData(templateId, dataValues || ['订单通知', '请及时查看', '', '', '']);

      // 调用微信订阅消息接口（云调用免access_token）
      const result = await cloud.openapi.subscribeMessage.send({
        touser: openid,
        templateId: templateId,
        page: `/pages/order/detail/detail?orderId=${orderId}`,
        miniprogramState: 'developer', // 上线后改成 release
        data: templateData
      });

      return {
        success: true,
        data: result,
        msg: '订阅消息发送成功'
      };
    }
    
    // ====================== 处理数据库触发器调用（状态变化推送）======================
    const { doc, oldDoc } = event
    const statusmax = doc.statusmax
    const orderId = doc.order_id || doc.orderNo || doc._id?.slice(-6) || '未知订单'
    const userOpenid = doc.openid || doc._openid || openid || ''

    // 状态变化检查：只有当statusmax发生变化时才推送
    if (oldDoc && oldDoc.statusmax === statusmax) {
      console.log(`【推送跳过】订单${orderId}：状态未变化`)
      return { success: true, msg: '状态未变化，跳过推送' }
    }

    // ====================== 9个状态全量推送 ======================
    // 1. 待支付 → 用户
    if (statusmax === STATUS_MAX.PAY_WAIT && userOpenid) {
      const dataValues = [orderId, '硒养山泉', '待支付', '请及时完成付款', ''];
      await sendSubscribeMsg(userOpenid, TEMPLATE.PAY_WAIT, dataValues, orderId);
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
      if (userOpenid) {
        const dataValues = [orderId, '硒养山泉', '¥' + (doc.totalPrice || 0), '准备配送', ''];
        await sendSubscribeMsg(userOpenid, TEMPLATE.DELIVERY_WAIT, dataValues, orderId);
        console.log(`【用户推送】订单${orderId}：待配送`)
      }
      // 商家通知
      console.log(`【商家推送】订单${orderId}：待配送`)
      await sendQyWechatMsg(orderId, '待配送', `订单${orderId}已接单，等待配送，请及时安排`)
    }

    // 4. 配送中 → 用户
    if (statusmax === STATUS_MAX.DELIVERING && userOpenid) {
      const dataValues = [orderId, new Date().toLocaleString(), '硒养山泉', '1', '配送中'];
      await sendSubscribeMsg(userOpenid, TEMPLATE.DELIVERING, dataValues, orderId);
      console.log(`【用户推送】订单${orderId}：配送中`)
    }

    // 5. 已完成 → 用户 + 商家
    if (statusmax === STATUS_MAX.COMPLETED) {
      // 用户通知
      if (userOpenid) {
        const dataValues = [orderId, '硒养山泉', '1', new Date().toLocaleString(), '订单已完成'];
        await sendSubscribeMsg(userOpenid, TEMPLATE.COMPLETED, dataValues, orderId);
        console.log(`【用户推送】订单${orderId}：已完成`)
      }
      // 商家通知
      console.log(`【商家推送】订单${orderId}：已完成`)
      await sendQyWechatMsg(orderId, '已完成', `订单${orderId}已完成，用户已签收`)
    }

    // 6. 已取消 → 用户 + 商家
    if (statusmax === STATUS_MAX.CANCELLED) {
      if (userOpenid) {
        const dataValues = [orderId, '硒养山泉', '订单已取消', new Date().toLocaleDateString(), ''];
        await sendSubscribeMsg(userOpenid, TEMPLATE.CANCELLED, dataValues, orderId);
        console.log(`【用户推送】订单${orderId}：已取消`)
      }
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
      if (userOpenid) {
        const dataValues = [orderId, '退款处理中', '', new Date().toLocaleString(), ''];
        await sendSubscribeMsg(userOpenid, TEMPLATE.REFUNDING, dataValues, orderId);
        console.log(`【用户推送】订单${orderId}：退款中`)
      }
      console.log(`【商家推送】订单${orderId}：退款中`)
      await sendQyWechatMsg(orderId, '退款中', `订单${orderId}正在退款处理中，请知悉`)
    }

    // 9. 退款成功 → 用户 + 商家
    if (statusmax === STATUS_MAX.REFUNDED) {
      // 用户通知
      if (userOpenid) {
        const dataValues = [orderId, '退款成功', '资金已原路返回', new Date().toLocaleString(), '成功'];
        await sendSubscribeMsg(userOpenid, TEMPLATE.REFUNDED, dataValues, orderId);
        console.log(`【用户推送】订单${orderId}：退款成功`)
      }
      // 商家通知
      console.log(`【商家推送】订单${orderId}：退款成功`)
      await sendQyWechatMsg(orderId, '退款成功', `订单${orderId}退款成功，已通知用户`)
    }

    return { success: true, msg: '9状态推送执行完成' }
  } catch (err) {
    console.error('推送失败', err)
    // 针对性处理错误
    if (err.errCode === -604101) {
      return { success: false, error: '权限未生效！请等待10分钟缓存过期后重试', errCode: err.errCode };
    } else if (err.errCode === 43101) {
      return { success: false, error: '用户已拒绝订阅该消息', errCode: err.errCode };
    } else {
      return { success: false, error: err.message, errCode: err.errCode };
    }
  }
}

// 🔥 统一发送小程序订阅消息（动态模板数据版）
async function sendSubscribeMsg(openid, templateId, dataValues, orderId) {
  const templateData = buildTemplateData(templateId, dataValues);
  
  return await cloud.openapi.subscribeMessage.send({
    touser: openid,
    templateId: templateId,
    page: `/pages/order/detail/detail?orderId=${orderId}`,
    data: templateData
  });
}

// 兼容旧版本的sendMsg函数
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
