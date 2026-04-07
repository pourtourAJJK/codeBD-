// 管理员退款审核列表云函数（最终修复版）
const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库实例
const db = cloud.database();
const _ = db.command;

/**
 * 管理员查询退款审核列表
 * 支持：分页、状态筛选、搜索
 */
const handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if(event.httpMethod === "OPTIONS") return { statusCode:204, headers };
  try {
    // 1. 接收入参
    const { 
      page = 1, 
      limit = 10,
      keyword 
    } = event;

    // 2. 初始化查询（查询退款表，核心修改）
    let query = db.collection('shop_refund');

    // 3. 搜索筛选
    if (keyword) {
      query = query.where({
        $or: [
          { order_id: _.regex({ regex: keyword, options: 'i' }) },
          { out_refund_no: _.regex({ regex: keyword, options: 'i' }) }
        ]
      });
    }
    
    // 4. 查询总数
    const totalRes = await query.count();
    const total = totalRes.total;

    // 5. 分页查询（按申请时间倒序）
    const ordersRes = await query
      .orderBy('apply_time', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get();

    // 6. 数据返回
    return {
      statusCode:200,
      headers,
      body:JSON.stringify({
        code: 200,
        message: '获取退款列表成功',
        data: {
          list: ordersRes.data,
          total,
          page,
          limit
        }
      })
    };

  } catch (error) {
    console.error('【云函数】获取退款列表失败：', error);
    return {
      statusCode:500,
      headers,
      body:JSON.stringify({
        code: 500,
        message: '获取退款列表失败，请稍后重试',
        data: null
      })
    };
  }
};

exports.main = handler;