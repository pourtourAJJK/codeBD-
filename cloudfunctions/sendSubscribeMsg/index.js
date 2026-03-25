// 小程序订阅消息推送云函数
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 小程序核心配置（请替换为实际参数）
const APP_ID = process.env.WX_APP_ID || '你的小程序AppID';
const APP_SECRET = process.env.WX_APP_SECRET || '你的小程序AppSecret';

// 获取 access_token
async function getAccessToken() {
  try {
    const res = await cloud.request({
      url: `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APP_ID}&secret=${APP_SECRET}`,
      method: 'GET'
    });
    
    if (res.data.errcode !== undefined && res.data.errcode !== 0) {
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
    const { openid, templateId, page, data } = event;

    // 参数验证
    if (!openid || !templateId) {
      return {
        code: 400,
        message: '缺少必要参数：openid 或 templateId',
        data: null
      };
    }

    const res = await cloud.request({
      url: `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
      method: 'POST',
      data: {
        touser: openid,
        template_id: templateId,
        page: page || 'pages/index/index', // 点击通知跳转的小程序页面
        data: data || {} // 模板填充数据
      }
    });

    if (res.data.errcode !== 0) {
      console.error('发送订阅消息失败:', res.data.errmsg);
      return {
        code: 500,
        message: '发送订阅消息失败',
        data: res.data
      };
    }

    return {
      code: 200,
      message: '发送订阅消息成功',
      data: res.data
    };
  } catch (error) {
    console.error('小程序订阅消息推送异常:', error);
    return {
      code: 500,
      message: '消息推送失败',
      data: { error: error.message }
    };
  }
};