const cloud = require("wx-server-sdk");
const { withResponse } = require("./response.js");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const CART_COLLECTION = "cart";
const PRODUCT_COLLECTION = "shop_spu";
const USER_COLLECTION = "shop_user";

async function ensureUserExists(openid) {
  const userRes = await db.collection(USER_COLLECTION).where({ openid }).get();
  return userRes.data.length > 0;
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

  const { countOnly = false } = event;

  const cartRes = await db
    .collection(CART_COLLECTION)
    .where({ openid, isDeleted: _.neq(true) })
    .get();

  const cartItems = cartRes.data || [];

  if (countOnly) {
    const count = cartItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );
    return { count }; // 直接返回，withResponse会包装
  }

  const productIds = [...new Set(cartItems.map((item) => item.product_id).filter(Boolean))];

  const productMap = new Map();
  if (productIds.length > 0) {
    const productRes = await db
      .collection(PRODUCT_COLLECTION)
      .where({ _id: _.in(productIds) })
      .get();
    (productRes.data || []).forEach((product) => {
      productMap.set(product._id, product);
    });
  }

  const formattedCartItems = cartItems.map((item) => {
    const product = productMap.get(item.product_id) || {};
    const currentPrice = Number(product.price) || Number(item.currentPrice) || 0;
    const originalPrice = Number(product.original_price) || Number(item.originalPrice) || 0;
    const quantity = Number(item.quantity) || 1;
    const stock = Number(product.stock) || 999;

    return {
      ...item,
      productTitle: product.name || item.productTitle || item.producttitle || "商品名称",
      productImage: product.cover_image || item.productImage || "/assets/images/default-product.png",
      currentPrice,
      originalPrice,
      spec: item.spec || product.spec || "默认规格",
      stock,
      quantity,
      subtotal: currentPrice * quantity,
    };
  });

  return {
    cartItems: formattedCartItems,
    totalItems: formattedCartItems.reduce((sum, item) => sum + item.quantity, 0),
  };
};

exports.main = withResponse(handler);
