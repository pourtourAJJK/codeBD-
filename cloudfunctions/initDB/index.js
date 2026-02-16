// 云函数入口文件
const cloud = require('wx-server-sdk');

const { withResponse } = require('../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 创建集合的函数
async function createCollection(collectionName) {
  try {
    await db.createCollection(collectionName);
    console.log(`集合 ${collectionName} 创建成功`);
  } catch (error) {
    console.log(`集合 ${collectionName} 已存在或创建失败:`, error.message);
  }
}

// 创建索引
async function createIndex(collectionName, indexConfig) {
  try {
    const result = await db.collection(collectionName).createIndex(indexConfig);
    console.log(`索引创建成功 for ${collectionName}:`, result);
  } catch (error) {
    console.log(`索引创建失败 for ${collectionName}:`, error.message);
  }
}

// 插入初始数据
async function insertInitialData(collectionName, data) {
  try {
    const checkResult = await db.collection(collectionName).count();
    if (checkResult.total === 0) {
      for (let item of data) {
        await db.collection(collectionName).add({ data: item });
      }
      console.log(`初始数据插入成功 for ${collectionName}`);
    } else {
      console.log(`数据已存在 for ${collectionName}, 跳过插入`);
    }
  } catch (error) {
    console.log(`初始数据插入失败 for ${collectionName}:`, error.message);
  }
}

// 云函数入口函数
const handler = async (event, context) => {
  const wxContext = cloud.getWXContext();

  console.log('开始初始化数据库...');

  // 定义所有需要创建的集合
  const collections = ['shop_user', 'shop_order', 'shop_spu', 'shop_category', 'coupons', 'marketing_campaigns', 'shop_address', 'feedbacks', 'sys_configs'];

  console.log(`计划创建的集合: ${collections.join(', ')}`);

  try {
    // 创建所有集合
    for (let collection of collections) {
      await createCollection(collection);
    }

    console.log('开始创建索引...');

    // 为shop_user集合创建索引
    await createIndex('shop_user', {
      index: {
        openid: 1
      },
      name: 'openid_index',
      unique: true
    });

    // 为shop_order集合创建索引
    await createIndex('shop_order', {
      index: {
        openid: 1,
        status: 1,
        createdAt: -1
      },
      name: 'order_user_status_date'
    });

    // 为shop_spu集合创建索引
    await createIndex('shop_spu', {
      index: {
        category: 1,
        status: 1
      },
      name: 'product_category_active'
    });

    await insertInitialData('marketing_campaigns', initialMarketing);

    console.log('数据库初始化完成');

    return {
      code: 200,
      message: '数据库初始化完成',
      data: {
        collectionsCreated: collections,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('数据库初始化过程中出错', error);
    return {
      code: 500,
      message: '数据库初始化失败',
      data: { error: error.message }
    };
  }
};

exports.main = withResponse(handler);
