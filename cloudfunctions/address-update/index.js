const cloud = require('wx-server-sdk');
const { withResponse } = require('../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const COLLECTION = 'shop_address';
const USER_COLLECTION = 'shop_user';
const PHONE_REGEX = /^1[3-9]\d{9}$/;

async function ensureUserExists(openid) {
  const userRes = await db.collection(USER_COLLECTION).where({ openid }).get();
  return userRes.data.length > 0;
}

function buildFullAddress(data = {}) {
  const { province = '', city = '', district = '', detail = '', houseNumber = '' } = data;
  return `${province}${city}${district}${detail}${houseNumber}`;
}

const handler = async (event = {}) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return { code: 401, message: '未登录', data: {} };
    }

    const userExists = await ensureUserExists(openid);
    if (!userExists) {
      return { code: 500, message: '用户不存在', data: {} };
    }

    const { addressId } = event;
    if (!addressId) {
      return { code: 500, message: '缺少地址ID参数', data: {} };
    }

    const addressRes = await db.collection(COLLECTION).where({ _id: addressId, openid }).get();
    if (!addressRes.data || addressRes.data.length === 0) {
      return { code: 500, message: '地址不存在或不属于该用户', data: {} };
    }

    const updateData = {};
    const fields = ['name', 'phone', 'province', 'city', 'district', 'detail', 'houseNumber', 'remark', 'tag', 'street', 'isDefault'];
    fields.forEach((field) => {
      if (event[field] !== undefined && event[field] !== null && event[field] !== '') {
        updateData[field] = event[field];
      }
    });

    if (updateData.phone && !PHONE_REGEX.test(updateData.phone)) {
      return { code: 500, message: '手机号格式不正确', data: {} };
    }

    const hasAddressFields = ['province', 'city', 'district', 'detail', 'houseNumber'].some((key) => key in updateData);
    if (hasAddressFields || updateData.fullAddress) {
      const merged = { ...addressRes.data[0], ...updateData };
      updateData.fullAddress = updateData.fullAddress || buildFullAddress(merged);
    }

    if (Object.keys(updateData).length === 0) {
      return { code: 500, message: '无可更新字段', data: {} };
    }

    updateData.updatedAt = db.serverDate();

    const transaction = await db.startTransaction();
    try {
      if (updateData.isDefault) {
        await transaction.collection(COLLECTION)
          .where({ openid, isDefault: true, _id: _.neq(addressId) })
          .update({ data: { isDefault: false } });
      }

      await transaction.collection(COLLECTION).doc(addressId).update({ data: updateData });
      await transaction.commit();

      return {
        code: 200,
        message: '更新地址成功',
        data: { addressId }
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('更新地址失败', error);
    return { code: 500, message: '更新地址失败', data: {} };
  }
};

exports.main = withResponse(handler);
