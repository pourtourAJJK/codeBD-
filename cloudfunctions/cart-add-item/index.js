const cloud = require('wx-server-sdk');
const { withResponse } = require('../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const CART_COLLECTION = 'cart';
const PRODUCT_COLLECTION = 'shop_spu';
const USER_COLLECTION = 'shop_user';

async function ensureUserExists(openid) {
  const userRes = await db.collection(USER_COLLECTION).where({ openid }).get();
  return userRes.data.length > 0;
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

    const productInfo = event.productInfo || {};
    const productId = productInfo.spuId || productInfo.product_id || event.product_id || '';
    const quantity = Number(productInfo.count || event.quantity || 1);
    const spec = productInfo.spec || '默认规格';

    if (!productId) {
      return { code: 500, message: '缺少商品ID参数', data: {} };
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      return { code: 500, message: '商品数量格式错误', data: {} };
    }

    const productRes = await db.collection(PRODUCT_COLLECTION).where({ _id: productId, status: '1' }).get();
    const product = productRes.data[0];
    if (!product) {
      return { code: 500, message: '商品不存在或已下架', data: {} };
    }

    const transaction = await db.startTransaction();
    try {
      const existing = await transaction.collection(CART_COLLECTION)
        .where({ openid, product_id: productId, spec, isDeleted: false })
        .get();

      if (existing.data.length > 0) {
        const item = existing.data[0];
        const newQuantity = Math.min(item.quantity + quantity, 999);
        await transaction.collection(CART_COLLECTION).doc(item._id).update({
          data: { quantity: newQuantity, updatedAt: db.serverDate() }
        });
      } else {
        const newItem = {
          openid,
          product_id: productId,
          spec,
          quantity: Math.min(quantity, 999),
          checked: true,
          isDeleted: false,
          productTitle: product.name || productInfo.name || '商品名称',
          productImage: product.cover_image || productInfo.cover_image || '/assets/images/default-product.png',
          currentPrice: Number(product.price) || Number(productInfo.price) || 0,
          originalPrice: Number(product.original_price) || Number(productInfo.originalPrice) || 0,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        };

        await transaction.collection(CART_COLLECTION).add({ data: newItem });
      }

      await transaction.commit();

      return { code: 200, message: '添加购物车成功', data: {} };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('添加购物车失败:', error);
    return { code: 500, message: '添加购物车失败', data: {} };
  }
};

exports.main = withResponse(handler);
