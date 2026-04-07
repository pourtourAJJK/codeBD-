const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if(event.httpMethod === "OPTIONS") return { statusCode:204, headers };
  const { productIds, status } = event;
  
  try {
    // 基础校验
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return {
        statusCode:400,
        headers,
        body:JSON.stringify({
          success: false,
          message: '商品ID数组不能为空'
        })
      };
    }
    
    if (status === undefined) {
      return {
        statusCode:400,
        headers,
        body:JSON.stringify({
          success: false,
          message: '目标状态不能为空'
        })
      };
    }
    
    const updateResults = await Promise.all(
      productIds.map(productId =>
        db.collection('shop_spu').doc(productId).update({
          data: {
            // 🔥 关键：把 status 转成字符串，匹配数据库 Schema
            status: String(status),
            updatedAt: new Date()
          }
        })
      )
    );
    
    return {
      statusCode:200,
      headers,
      body:JSON.stringify({
        success: true,
        message: `成功更新 ${updateResults.length} 个商品`,
        data: updateResults
      })
    };
  } catch (err) {
    console.error("批量更新失败：", err);
    return { 
      statusCode:500,
      headers,
      body:JSON.stringify({ success: false, message: err.message })
    };
  }
};