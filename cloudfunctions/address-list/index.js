const cloud = require("wx-server-sdk");
const { withResponse } = require("./response.js");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const COLLECTION = "shop_address";
const USER_COLLECTION = "shop_user";

async function ensureUserExists(openid) {
  const userRes = await db.collection(USER_COLLECTION).where({ openid }).get();
  return userRes.data.length > 0;
}

const handler = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    throw new Error("用户未登录");
  }

  const userExists = await ensureUserExists(openid);
  if (!userExists) {
    throw new Error("用户不存在");
  }

  const result = await db
    .collection(COLLECTION)
    .where({ openid })
    .orderBy("isDefault", "desc")
    .orderBy("updatedAt", "desc")
    .get();

  // withResponse 会自动包装
  return result.data || [];
};

exports.main = withResponse(handler);
