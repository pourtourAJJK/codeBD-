const cloud = require('wx-server-sdk');
const { withResponse } = require('./response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const ORDER_COLLECTION = 'shop_order';
const ORDER_ITEMS_COLLECTION = 'orderItems';
const PRODUCT_COLLECTION = 'shop_spu';

// 新增：自动取消超时订单并释放库存（支持手动单条与批量定时）
const handler = async (event = {}) => {
  const { orderId, batch } = event; // batch=true 用于定时批量
  const now = Date.now();
  const fifteen = 15 * 60 * 1000;

  // 只处理待支付且未自动取消、且取消时间在15分钟前的订单
  const baseWhere = {
    status: 'pending',
    autoCancelStatus: 'pending',
    cancelPayTime: _.lte(new Date(now - fifteen))
  };

  let targets = [];
  if (batch) {
    const res = await db.collection(ORDER_COLLECTION).where(baseWhere).limit(50).get();
    targets = res.data || [];
  } else {
    if (!orderId) return { code: 500, message: '缺少订单ID', data: {} };
    const res = await db.collection(ORDER_COLLECTION)
      .where({ ...baseWhere, order_id: orderId })
      .limit(1)
      .get();
    targets = res.data || [];
  }

  if (!targets.length) return { code: 200, message: '无可取消订单', data: { count: 0 } };

  let successCount = 0;
  for (const order of targets) {
    const tx = await db.startTransaction();
    try {
      const itemsRes = await tx.collection(ORDER_ITEMS_COLLECTION)
        .where({ order_id: order.order_id, openid: order.openid })
        .get();
      const items = itemsRes.data && itemsRes.data.length ? itemsRes.data : (order.goods || []);

      // 释放锁定库存
      if (items.length) {
        for (const it of items) {
          await tx.collection(PRODUCT_COLLECTION).doc(it.product_id).update({
            data: {
              lockedStock: _.inc(-Number(it.quantity || 0)),
              updatedAt: db.serverDate()
            }
          });
        }
      }

      // 更新订单状态
      await tx.collection(ORDER_COLLECTION).doc(order._id).update({
        data: {
          status: 'cancelled',
          autoCancelStatus: 'cancelled',
          cancelTime: db.serverDate(),
          updatedAt: db.serverDate()
        }
      });

      await tx.commit();
      successCount += 1;
    } catch (err) {
      await tx.rollback();
      console.error('autoCancelOrder 处理失败', err);
    }
  }

  return { code: 200, message: '处理完成', data: { count: successCount } };
};

exports.main = withResponse(handler);
