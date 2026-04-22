const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  try {
    const { code } = event;
    const { OPENID } = cloud.getWXContext();

    // 参数校验
    if (!code) {
      return { code: 400, message: "缺少授权code", data: null };
    }
    if (!OPENID) {
      return { code: 400, message: "未登录", data: null };
    }

    // 调用微信官方接口解密手机号
    const result = await cloud.openapi.phonenumber.getPhoneNumber({ code });
    // 精准获取手机号（匹配官方返回格式）
    const phoneNumber = result.phoneInfo.phoneNumber;

    if (!phoneNumber) {
      return { code: 400, message: "未获取到手机号", data: null };
    }

    // 查询用户（增加空值判断，防止崩溃）
    const userRes = await db.collection('shop_user').where({ openid: OPENID }).get();
    if (userRes.data.length === 0) {
      return { code: 404, message: "用户不存在", data: null };
    }

    // 更新数据库手机号
    await db.collection('shop_user').doc(userRes.data[0]._id).update({
      data: { 
        phoneNumber: phoneNumber, 
        updateTime: db.serverDate() 
      }
    });

    // 绑定成功返回
    return {
      code: 200,
      message: "手机号绑定成功",
      data: { 
        phoneNumber: phoneNumber,
        isNewUser: false // 这里设置为false，因为用户已经存在
      }
    };

  } catch (err) {
    console.error("绑定失败详情：", err);
    return {
      code: 400,
      message: "绑定失败：" + (err.errMsg || "系统异常"),
      data: null
    };
  }
};