const cloud = require('wx-server-sdk');
const { withResponse } = require('./response');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 新增：为旧订单补充超时/锁定字段的兼容脚本（按需跑一次）
const handler = async () => {
  const pageSize = 200;
  let totalUpdated = 0;
  let skip = 0;

  while (true) {
    const res = await db.collection('shop_order')
      .where({
        _updateFlag: _.neq('autoCancelV1').or(_.exists(false))
      })
      .skip(skip)
      .limit(pageSize)
      .get();

    if (!res.data.length) break;

    const batch = res.data.map(item => {
      const patch = {
        cancelPayTime: item.cancelPayTime ?? null,
        autoCancelStatus: item.autoCancelStatus ?? 'pending',
        stockLocked: item.stockLocked ?? true,
        lockedStock: Array.isArray(item.lockedStock) ? item.lockedStock : [],
        _updateFlag: 'autoCancelV1'
      };
      return db.collection('shop_order').doc(item._id).update({ data: patch });
    });

    await Promise.all(batch);
    totalUpdated += res.data.length;
    skip += res.data.length;
    if (res.data.length < pageSize) break;
  }

  return { code: 200, message: '补充完成', data: { totalUpdated } };
};

exports.main = withResponse(handler);
