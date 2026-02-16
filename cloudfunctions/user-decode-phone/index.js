const cloud = require("wx-server-sdk");
const { withResponse } = require("./response.js");
const openDataUtil = require("./openDataUtil.js");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 解码并绑定用户手机号
 * 1. 从数据库获取用户的 session_key
 * 2. 使用 openDataUtil 解密手机号
 * 3. 将解密后的手机号更新到用户记录中
 */
const handler = async (event) => {
  const { encryptedData, iv } = event;
  if (!encryptedData || !iv) {
    throw new Error("缺少加密数据或IV");
  }

  const { OPENID } = cloud.getWXContext();
  if (!OPENID) {
    throw new Error("获取用户信息失败，无法解密");
  }

  // 1. 从数据库获取用户的 session_key
  const userRes = await db.collection("shop_user").where({ openid: OPENID }).get();
  if (!userRes.data || userRes.data.length === 0) {
    throw new Error("未找到该用户记录");
  }

  const currentUser = userRes.data[0];
  const sessionKey = currentUser.session_key;

  if (!sessionKey) {
    throw new Error("用户 session_key 不存在，无法解密。请尝试重新登录");
  }

  // 2. 使用 session_key 解密数据
  const decodedData = openDataUtil.decryptData(encryptedData, sessionKey, iv);
  if (!decodedData || !decodedData.purePhoneNumber) {
    throw new Error("手机号解密失败，请重试");
  }

  const { purePhoneNumber } = decodedData;

  // 3. 将手机号更新到数据库
  await db.collection("shop_user").doc(currentUser._id).update({
    data: {
      phone: purePhoneNumber,
      updateTime: db.serverDate(),
    },
  });

  console.log(`成功为用户 ${OPENID} 绑定手机号 ${purePhoneNumber}`);

  return {
    message: "手机号绑定成功",
    phoneInfo: decodedData,
  };
};

exports.main = withResponse(handler);
