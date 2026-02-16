const cloud = require("wx-server-sdk");
const { withResponse } = require("./response.js");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 获取用户信息云函数
 * 统一集合：shop_user，统一字段：openid
 */
const handler = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const openid = event.openid || wxContext.OPENID;

  if (!openid) {
    throw new Error("未登录或openid无效");
  }

  const userRes = await db.collection("shop_user").where({ openid }).get();
  const userInfo = userRes.data[0] || {};

  // 直接返回用户信息，withResponse会自动包装
  return {
    userInfo,
  };
};

exports.main = withResponse(handler);
