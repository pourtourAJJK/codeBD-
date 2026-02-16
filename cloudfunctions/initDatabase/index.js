// 云函数入口文件
const cloud = require('wx-server-sdk');

const { withResponse } = require('../utils/response');

// 使用云函数当前所在环境初始化
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库引用
const db = cloud.database();
const _ = db.command;

// 云函数入口函数
const handler = async (event, context) => {
  try {
    // 1. 创建集合
    await createCollections();

    // 2. 创建索引
    await createIndexes();

    // 3. 插入初始数据
    await insertInitialData();

    // 4. 返回成功结果
    return {
      code: 200,
      message: '数据库初始化成功',
      data: {}
    };
  } catch (error) {
    console.error('数据库初始化失败', error);
    return {
      code: 500,
      message: '数据库初始化失败: ' + error.message,
      data: { error: error.message }
    };
  }
};

// 创建集合
async function createCollections() {
  try {
    // 创建用户集合
    await db.createCollection('shop_user').catch(() => console.log('shop_user集合已存在'));

    // 创建商品集合
    await db.createCollection('shop_spu').catch(() => console.log('shop_spu集合已存在'));

    // 创建订单集合
    await db.createCollection('shop_order').catch(() => console.log('shop_order集合已存在'));

    // 创建购物车集合
    await db.createCollection('cart').catch(() => console.log('cart集合已存在'));

    // 创建地址集合
    await db.createCollection('shop_address').catch(() => console.log('shop_address集合已存在'));

    // 创建商品分类集合
    await db.createCollection('shop_category').catch(() => console.log('shop_category集合已存在'));

    // 创建优惠券集合
    await db.createCollection('coupons').catch(() => console.log('coupons集合已存在'));

    // 创建物流信息集合
    await db.createCollection('logistics').catch(() => console.log('logistics集合已存在'));

    console.log('集合创建成功');
  } catch (error) {
    console.error('创建集合失败', error);
    throw error;
  }
}

// 创建索引
async function createIndexes() {
  try {
    // 用户集合索引
    await db.collection('shop_user').createIndex({ openid: 1 }, { unique: true }).catch(() => console.log('shop_user集合openid索引已存在'));

    // 商品集合索引
    await db.collection('shop_spu').createIndex({ category: 1 }).catch(() => console.log('shop_spu集合category索引已存在'));
    await db.collection('shop_spu').createIndex({ status: 1 }).catch(() => console.log('shop_spu集合status索引已存在'));

    // 订单集合索引
    await db.collection('shop_order').createIndex({ openid: 1 }).catch(() => console.log('shop_order集合openid索引已存在'));
    await db.collection('shop_order').createIndex({ order_id: 1 }, { unique: true }).catch(() => console.log('shop_order集合order_id索引已存在'));
    await db.collection('shop_order').createIndex({ status: 1 }).catch(() => console.log('shop_order集合status索引已存在'));

    // 购物车集合索引
    await db.collection('cart').createIndex({ openid: 1 }).catch(() => console.log('cart集合openid索引已存在'));
    await db.collection('cart').createIndex({ product_id: 1 }).catch(() => console.log('cart集合product_id索引已存在'));

    // 地址集合索引
    await db.collection('shop_address').createIndex({ openid: 1 }).catch(() => console.log('shop_address集合openid索引已存在'));

    // 优惠券集合索引
    await db.collection('coupons').createIndex({ openid: 1 }).catch(() => console.log('coupons集合openid索引已存在'));
    await db.collection('coupons').createIndex({ status: 1 }).catch(() => console.log('coupons集合status索引已存在'));

    // 物流信息集合索引
    await db.collection('logistics').createIndex({ order_id: 1 }).catch(() => console.log('logistics集合order_id索引已存在'));

    console.log('索引创建成功');
  } catch (error) {
    console.error('创建索引失败', error);
    throw error;
  }
}

// 插入初始数据
async function insertInitialData() {
  try {
    // 插入商品数据
    await insertProducts();

    // 插入优惠券数据
    await insertCoupons();

    console.log('初始数据插入成功');
  } catch (error) {
    console.error('插入初始数据失败', error);
    throw error;
  }
}

// 插入商品数据
async function insertProducts() {
  // 检查是否已有商品数据
  const countResult = await db.collection('shop_spu').count();
  if (countResult.total > 0) {
    console.log('商品数据已存在，跳过插入');
    return;
  }

  // 批量插入商品数据
  for (const product of products) {
    await db.collection('shop_spu').add({
      data: product
    });
  }

  console.log('商品数据插入成功');
}

// 插入优惠券数据
async function insertCoupons() {
  // 检查是否已有优惠券数据
  const countResult = await db.collection('coupons').count();
  if (countResult.total > 0) {
    console.log('优惠券数据已存在，跳过插入');
    return;
  }

  // 初始优惠券数据
  const coupons = [
    {
      name: '新人专享优惠券',
      description: '新用户注册即可领取',
      type: 'amount',
      value: 5,
      minAmount: 0,
      maxAmount: 5,
      startTime: new Date(),
      endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
      createTime: new Date()
    },
    {
      name: '满100减10优惠券',
      description: '订单满100元即可使用',
      type: 'amount',
      value: 10,
      minAmount: 100,
      maxAmount: 10,
      startTime: new Date(),
      endTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: 'active',
      createTime: new Date()
    },
    {
      name: '满200减30优惠券',
      description: '订单满200元即可使用',
      type: 'amount',
      value: 30,
      minAmount: 200,
      maxAmount: 30,
      startTime: new Date(),
      endTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: 'active',
      createTime: new Date()
    }
  ];

  // 批量插入优惠券数据
  for (const coupon of coupons) {
    await db.collection('coupons').add({
      data: coupon
    });
  }

  console.log('优惠券数据插入成功');
}

exports.main = withResponse(handler);
