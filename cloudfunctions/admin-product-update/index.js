// 管理员更新商品云函数
const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库实例
const db = cloud.database();

/**
 * 管理员更新商品信息
 * @param {Object} event - 事件参数
 * @returns {Object} - 更新结果
 */
exports.main = async (event, context) => {
  console.log('=== 云函数开始执行 ===');
  console.log('接收到的 event:', JSON.stringify(event));
  
  try {
    // 1. 获取参数（兼容多种传参方式）
    const productId = event.productId || event.id;
    const productData = event.productData || event.data || event;
    
    console.log('解析后的 productId:', productId);
    console.log('解析后的 productData:', JSON.stringify(productData));
    
    // 2. 基础校验
    if (!productId) {
      return {
        code: 400,
        success: false,
        message: '商品ID不能为空',
        debug: { receivedEvent: event }
      };
    }
    
    if (!productData || typeof productData !== 'object') {
      return {
        code: 400,
        success: false,
        message: '商品数据不能为空',
        debug: { receivedEvent: event }
      };
    }
    
    // 3. 验证商品是否存在
    const productRes = await db.collection('shop_spu').doc(productId).get();
    if (!productRes.data) {
      return {
        code: 404,
        success: false,
        message: '商品不存在'
      };
    }
    
    // 4. 构建更新数据
    const updateData = {
      updateTime: db.serverDate(),
      updatedAt: new Date() // 更新时间：当前时间
    };
    
    // 商品名称
    if (productData.name !== undefined) {
      updateData.name = productData.name;
    }
    
    // 商品分类
    if (productData.category !== undefined) {
      updateData.category = productData.category;
    }
    
    // 商品详情
    if (productData.detail !== undefined) {
      updateData.detail = productData.detail;
    }
    
    // 图文详情
    if (productData.tuwen_detail !== undefined) {
      updateData.tuwen_detail = productData.tuwen_detail;
    }
    
    // 商品状态（字符串格式：'1'=上架，'2'=下架）
    if (productData.status !== undefined) {
      updateData.status = productData.status === '下架' || productData.status === 'inactive' || productData.status === '2' || productData.status === 2 || productData.status === 0 ? '2' : '1';
    }
    
    // 支付状态（字符串格式：'1'=上架，'0'=下架）
    if (productData.pay_status !== undefined) {
      updateData.pay_status = productData.pay_status === '1' ? '1' : '0';
    }
    
    // 封面图
    if (productData.cover_image !== undefined) {
      updateData.cover_image = productData.cover_image;
    }
    
    // 规格数据 - 直接接收字符串格式
    if (productData.spec !== undefined) {
      updateData.spec = String(productData.spec);
    }
    
    // 价格 - 直接接收数字
    if (productData.price !== undefined) {
      updateData.price = Number(productData.price) || 0;
    }
    
    // 原价
    if (productData.original_price !== undefined) {
      updateData.original_price = Number(productData.original_price) || 0;
    }
    
    // 库存 - 直接接收数字
    if (productData.stock !== undefined) {
      updateData.stock = Number(productData.stock) || 0;
    }
    
    // 销量
    if (productData.sales !== undefined) {
      updateData.sales = Number(productData.sales) || 0;
    }
    
    console.log('准备更新的数据:', JSON.stringify(updateData));
    
    // 5. 执行更新
    const updateResult = await db.collection('shop_spu').doc(productId).update({
      data: updateData
    });
    
    console.log('数据库更新结果:', updateResult);
    
    if (updateResult.stats && updateResult.stats.updated > 0) {
      return {
        code: 200,
        success: true,
        message: '更新商品成功',
        data: {
          productId: productId,
          updatedFields: Object.keys(updateData)
        }
      };
    } else {
      return {
        code: 200,
        success: true,
        message: '商品数据未变更',
        data: {
          productId: productId,
          message: '商品数据未发生变更'
        }
      };
    }
  } catch (error) {
    console.error('云函数执行错误:', error);
    return {
      code: 500,
      success: false,
      message: `服务器错误: ${error.message}`,
      error: error.stack
    };
  }
};
