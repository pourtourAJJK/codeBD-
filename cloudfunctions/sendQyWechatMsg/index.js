// 企业微信消息推送云函数
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 企业微信核心配置（请替换为实际参数）
const CORP_ID = process.env.QY_CORP_ID || '你的CorpID';
const AGENT_ID = process.env.QY_AGENT_ID || '你的AgentID';
const SECRET = process.env.QY_SECRET || '你的Secret';

// 获取 access_token（调用API的凭证）
async function getAccessToken() {
  try {
    const res = await cloud.request({
      url: `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${CORP_ID}&corpsecret=${SECRET}`,
      method: 'GET'
    });
    
    if (res.data.errcode !== 0) {
      console.error('获取access_token失败:', res.data.errmsg);
      throw new Error(res.data.errmsg);
    }
    
    return res.data.access_token;
  } catch (error) {
    console.error('获取access_token异常:', error);
    throw error;
  }
}

// 云函数主入口
exports.main = async (event, context) => {
  try {
    const accessToken = await getAccessToken();
    const { orderId, status, toUser, content } = event; // toUser=管理员企业微信userid

    // 构建消息内容
    const messageContent = content || `订单${orderId}状态变更：${status}，请及时处理！`;

    const res = await cloud.request({
      url: `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`,
      method: 'POST',
      data: {
        touser: toUser,
        agentid: AGENT_ID,
        msgtype: 'text',
        text: {
          content: messageContent
        }
      }
    });

    if (res.data.errcode !== 0) {
      console.error('发送企业微信消息失败:', res.data.errmsg);
      return {
        code: 500,
        message: '发送消息失败',
        data: res.data
      };
    }

    return {
      code: 200,
      message: '发送消息成功',
      data: res.data
    };
  } catch (error) {
    console.error('企业微信消息推送异常:', error);
    return {
      code: 500,
      message: '消息推送失败',
      data: { error: error.message }
    };
  }
};