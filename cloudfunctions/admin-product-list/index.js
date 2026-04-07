// 管理员商品列表云函数
const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库实例
const db = cloud.database();
const _ = db.command;

/**
 * 管理员查询商品列表
 * @param {Object} event - 事件参数
 * @param {number} event.page - 页码，默认1
 * @param {number} event.limit - 每页数量，默认10
 * @param {string} event.status - 商品状态筛选
 * @param {string} event.keyword - 关键词搜索
 * @returns {Object} - 商品列表结果
 */
const handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if(event.httpMethod === "OPTIONS") return { statusCode:204, headers };
  try {
    const { page = 1, limit = 10, status, keyword } = event;
    
    // 构建查询条件
    let query = db.collection('shop_spu');
    
    // 状态筛选
    if (status === '上架') {
      query = query.where({ status: _.eq(1) });
    } else if (status === '下架') {
      query = query.where({ status: _.eq(0) });
    } else if (status === 'active') {
      query = query.where({ status: _.eq(1) });
    } else if (status === 'inactive') {
      query = query.where({ status: _.eq(0) });
    }
    
    // 关键词搜索
    if (keyword) {
      query = query.where({
        name: _.regex({ regex: keyword, options: 'i' })
      });
    }
    
    // 计算总数
    const totalRes = await query.count();
    const total = totalRes.total;
    
    // 分页查询
    const productsRes = await query
      .orderBy('createTime', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get();
    
    // 转换商品数据
    const products = productsRes.data.map(product => ({
      _id: product._id,
      name: product.name || '',
      price: product.price || 0,
      stock: product.stock || 0,
      image: product.cover_image || product.image || '',
      status: product.status === 1 ? '上架' : '下架',
      category: product.category || '',
      sales: product.sales || 0,
      spec: product.spec || [],
      create_time: product.createTime || product.createdAt
    }));
    
    return {
      statusCode:200,
      headers,
      body:JSON.stringify({
        code: 200,
        message: '获取商品列表成功',
        data: {
          records: products,
          total,
          page,
          limit
        }
      })
    };
  } catch (error) {
    console.error('获取商品列表失败:', error);
    return {
      statusCode:500,
      headers,
      body:JSON.stringify({
        code: 500,
        message: '获取商品列表失败，请稍后重试',
        data: null
      })
    };
  }
};

exports.main = handler;