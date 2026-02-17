const cloud = require("wx-server-sdk");
const { withResponse } = require("./response.js");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const COLLECTION = "shop_address";
const USER_COLLECTION = "shop_user";
// ✅ 修复正则表达式：\d 不是 \\d
const PHONE_REGEX = /^1[3-9]\d{9}$/;

async function ensureUserExists(openid) {
  const userRes = await db.collection(USER_COLLECTION).where({ openid }).get();
  return userRes.data.length > 0;
}

function buildFullAddress(data = {}) {
  const { province = "", city = "", district = "", detail = "", houseNumber = "" } = data;
  return `${province}${city}${district}${detail}${houseNumber}`;
}

const handler = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    throw new Error("用户未登录");
  }

  const userExists = await ensureUserExists(openid);
  if (!userExists) {
    throw new Error("用户不存在");
  }

  const {
    name,
    phone,
    province,
    city,
    district,
    detail,
    houseNumber = "", // ✅ 门牌号改为可选，默认空字符串
    isDefault = false,
    remark = "",
    tag = "",
    fullAddress,
    street,
  } = event;

  // ✅ 门牌号已改为非必填，不再验证
  if (!name || !phone || !province || !city || !district || !detail) {
    throw new Error("缺少必要参数");
  }

  if (!PHONE_REGEX.test(phone)) {
    throw new Error("手机号格式不正确");
  }

  const addressData = {
    openid,
    name,
    phone,
    province,
    city,
    district,
    detail,
    houseNumber,
    fullAddress: fullAddress || buildFullAddress({ province, city, district, detail, houseNumber }),
    isDefault: !!isDefault,
    remark,
    tag,
    street: street || detail,
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
  };

  const transaction = await db.startTransaction();
  try {
    if (addressData.isDefault) {
      await transaction
        .collection(COLLECTION)
        .where({ openid, isDefault: true })
        .update({ data: { isDefault: false } });
    }

    const result = await transaction.collection(COLLECTION).add({ data: addressData });
    await transaction.commit();

    return {
      addressId: result._id,
      address: { ...addressData, _id: result._id },
    };
  } catch (error) {
    await transaction.rollback();
    // 抛出错误，由 withResponse 统一处理
    throw error;
  }
};

exports.main = withResponse(handler);
