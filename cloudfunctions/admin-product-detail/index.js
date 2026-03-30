// 管理员获取商品详情云函数
const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库实例
const db = cloud.database();

/**
 * 管理员获取商品详情
 * @param {Object} event - 事件参数
 * @returns {Object} - 商品详情结果
 */
exports.main = async (event, context) => {
  console.log('=== 云函数开始执行 ===');
  console.log('接收到的 event:', JSON.stringify(event));
  
  try {
    // 1. 获取参数（兼容多种传参方式）
    const productId = event.productId || event.id || event._id;
    
    console.log('解析后的 productId:', productId);
    
    // 2. 基础校验
    if (!productId) {
      return {
        code: 400,
        success: false,
        message: '商品ID不能为空',
        debug: { receivedEvent: event }
      };
    }
    
    // 3. 查询商品详情
    const productRes = await db.collection('shop_spu').doc(productId).get();
    const product = productRes.data;
    
    if (!product) {
      return {
        code: 404,
        success: false,
        message: '商品不存在'
      };
    }
    
    console.log('查询到的商品数据:', JSON.stringify(product));
    
    // 4. 转换封面图为临时URL
    let coverImage = product.cover_image || '';
    if (coverImage && coverImage.startsWith('cloud://')) {
      try {
        const tempRes = await cloud.getTempFileURL({ fileList: [coverImage] });
        coverImage = tempRes.fileList?.[0]?.tempFileURL || coverImage;
      } catch (error) {
        console.error('封面图转换失败:', error);
      }
    }
    
    // 5. 转换富文本中的云存储图片URL
    let detail = product.detail || '';
    let tuwenDetail = product.tuwen_detail || '';
    
    // 处理富文本中的 cloud:// 链接
    const cloudFileIdRegex = /cloud:\/\/[^"']+/g;
    const cloudFileIds = [...(detail.match(cloudFileIdRegex) || []), ...(tuwenDetail.match(cloudFileIdRegex) || [])];
    
    if (cloudFileIds.length > 0) {
      try {
        const tempRes = await cloud.getTempFileURL({ fileList: cloudFileIds });
        const fileMap = {};
        (tempRes.fileList || []).forEach(file => {
          if (file.fileID && file.status === 0 && file.tempFileURL) {
            fileMap[file.fileID] = file.tempFileURL;
          }
        });
        
        detail = detail.replace(cloudFileIdRegex, (fileId) => fileMap[fileId] || fileId);
        tuwenDetail = tuwenDetail.replace(cloudFileIdRegex, (fileId) => fileMap[fileId] || fileId);
      } catch (error) {
        console.error('富文本图片转换失败:', error);
      }
    }
    
    // 6. 转换状态（'1'=上架，'2'=下架）
    const status = product.status === 1 || product.status === '1' || product.status === 'active' ? '上架' : '下架';
    const statusValue = product.status === 1 || product.status === '1' || product.status === 'active' ? '1' : '2';
    
    // 7. 组装返回数据
    const resultProduct = {
      _id: product._id,
      productId: product._id,
      name: product.name || '',
      category: product.category || '',
      detail: detail,
      tuwen_detail: tuwenDetail,
      status: statusValue,
      cover_image: coverImage,
      spec: product.spec || '',
      pay_status: product.pay_status || '1',
      price: product.price || 0,
      original_price: product.original_price || 0,
      stock: product.stock || 0,
      sales: product.sales || 0,
      // 返回新的时间字段和创建者字段
      createdAt: product.createdAt || product.createTime,
      updatedAt: product.updatedAt || product.updateTime,
      _openid: product._openid || '',
      // 保留原有的 create_time 和 update_time 以保持兼容性
      create_time: product.createTime || product.createdAt,
      update_time: product.updateTime || product.updatedAt
    };
    
    console.log('返回的商品数据:', JSON.stringify(resultProduct));
    
    return {
      code: 200,
      success: true,
      message: '获取商品详情成功',
      data: resultProduct
    };
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
