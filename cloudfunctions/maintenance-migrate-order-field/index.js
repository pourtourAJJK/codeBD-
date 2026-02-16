const cloud = require('wx-server-sdk');
const { withResponse } = require('../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const handler = async (event = {}) => {
  try {
    const { legacyField, targetField = 'openid', removeLegacy = true } = event;

    if (!legacyField) {
      return { code: 500, message: '缺少 legacyField 参数', data: {} };
    }

    let skip = 0;
    const limit = 100;
    let hasMore = true;
    let totalUpdated = 0;

    while (hasMore) {
      const orderResult = await db.collection('shop_order')
        .where({ [legacyField]: _.exists(true) })
        .skip(skip)
        .limit(limit)
        .get();

      const orders = orderResult.data || [];
      if (orders.length === 0) {
        hasMore = false;
        break;
      }

      const updateTasks = orders.map(order => {
        const updateData = {
          [targetField]: order[legacyField]
        };
        if (removeLegacy) {
          updateData[legacyField] = _.remove();
        }
        return db.collection('shop_order').doc(order._id).update({ data: updateData });
      });

      await Promise.all(updateTasks);
      totalUpdated += orders.length;
      skip += limit;
    }

    return {
      code: 200,
      message: `字段迁移完成，共处理 ${totalUpdated} 条订单`,
      data: { totalUpdated }
    };
  } catch (err) {
    console.error('字段迁移失败', err);
    return { code: 500, message: err.message || '字段迁移失败', data: {} };
  }
};

exports.main = withResponse(handler);
