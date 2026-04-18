const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();

// 🔥 微信官方最新：云调用获取手机号（无需session_key/encryptedData/iv）
exports.main = async (event, context) => {
  try {
    console.log("云函数入参：", event);
    const { cloudID } = event;
    const openid = cloud.getWXContext().OPENID;

    if (!cloudID) {
      return { code: 400, message: "缺少cloudID", data: null };
    }
    if (!openid) {
      return { code: 400, message: "未登录", data: null };
    }

    // 官方接口：用cloudID换取手机号
    const result = await cloud.openapi.phonenumber.getPhoneNumber({
      code: cloudID
    });
    console.log("手机号获取结果：", result);

    const phoneNumber = result.data.phoneInfo.phoneNumber;
    if (!phoneNumber) {
      return { code: 400, message: "获取手机号失败", data: null };
    }

    // 更新数据库
    const userRes = await db.collection('shop_user').where({ openid }).get();
    if (userRes.data.length === 0) {
      return { code: 404, message: "用户不存在", data: null };
    }

    await db.collection('shop_user').doc(userRes.data[0]._id).update({
      data: {
        phoneNumber: phoneNumber,
        updateTime: db.serverDate()
      }
    });

    return {
      code: 200,
      message: "手机号绑定成功",
      data: { phoneNumber }
    };

  } catch (err) {
    // 🔥 打印真实错误（关键！）
    console.error("绑定失败详情：", err);
    return {
      code: 400,
      message: "绑定失败：" + (err.errMsg || JSON.stringify(err)),
      data: null
    };
  }
};