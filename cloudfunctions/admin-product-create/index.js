// 管理员创建商品云函数
const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库实例
const db = cloud.database();

/**
 * 管理员创建新商品
 * @param {Object} event - 事件参数
 * @returns {Object} - 创建结果
 */
exports.main = async (event, context) => {
  console.log('=== 云函数开始执行 ===');
  console.log('接收到的 event:', JSON.stringify(event));
  
  try {
    // 1. 获取参数（兼容多种传参方式）
    // 从 event 中拆分出「商品数据」和「上下文信息（tcbContext）」
    const { tcbContext, ...productData } = event;
    
    console.log('解析后的 productData:', JSON.stringify(productData));
    
    // 2. 基础校验
    if (!productData || typeof productData !== 'object') {
      return {
        code: 400,
        success: false,
        message: '商品数据不能为空',
        debug: { receivedEvent: event }
      };
    }
    
    // 3. 必填字段校验
    const requiredFields = ['name'];
    for (const field of requiredFields) {
      if (!productData[field] && productData[field] !== 0) {
        return {
          code: 400,
          success: false,
          message: `缺少必填字段: ${field}`
        };
      }
    }
    
    // 商品名称不能为空
    if (!productData.name || productData.name.trim() === '') {
      return {
        code: 400,
        success: false,
        message: '商品名称不能为空'
      };
    }
    
    // 4. 构建创建数据
    const createData = {
      name: productData.name.trim(),
      // 补充 3 个字段：createdAt、updatedAt、_openid
      createdAt: new Date(),       // 创建时间：当前时间
      updatedAt: new Date(),       // 更新时间：新增时和创建时间一致
      _openid: tcbContext?.user_id || '', // 创建者：从上下文里拿当前用户的 ID
      // 保留原有的 createTime 和 updateTime 以保持兼容性
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };
    
    // 商品分类
    if (productData.category !== undefined) {
      createData.category = productData.category;
    }
    
    // 商品详情
    if (productData.detail !== undefined) {
      createData.detail = productData.detail;
    }
    
    // 图文详情
    if (productData.tuwen_detail !== undefined) {
      createData.tuwen_detail = productData.tuwen_detail;
    }
    
    // 商品状态（字符串格式：'1'=上架，'2'=下架，默认为上架）
    if (productData.status !== undefined) {
      createData.status = productData.status === '下架' || productData.status === 'inactive' || productData.status === '2' || productData.status === 2 || productData.status === 0 ? '2' : '1';
    } else {
      createData.status = '1'; // 默认为上架
    }
    
    // 支付状态（字符串格式：'1'=上架，'0'=下架）
    if (productData.pay_status !== undefined) {
      createData.pay_status = productData.pay_status === '1' ? '1' : '0';
    } else {
      createData.pay_status = '1'; // 默认为上架
    }
    
    // 封面图
    if (productData.cover_image !== undefined) {
      createData.cover_image = productData.cover_image;
    }
    
    // 规格数据 - 直接接收字符串格式
    if (productData.spec !== undefined) {
      createData.spec = String(productData.spec);
    } else {
      createData.spec = '';
    }
    
    // 价格 - 直接接收数字
    if (productData.price !== undefined) {
      createData.price = Number(productData.price) || 0;
    } else {
      createData.price = 0;
    }
    
    // 库存 - 直接接收数字
    if (productData.stock !== undefined) {
      createData.stock = Number(productData.stock) || 0;
    } else {
      createData.stock = 0;
    }
    
    // 原价
    if (productData.original_price !== undefined) {
      createData.original_price = Number(productData.original_price) || 0;
    }
    
    // 销量（默认为0）
    createData.sales = 0;
    
    // 锁定库存（默认为0）
    createData.lockedStock = 0;
    
    console.log('准备插入的数据:', JSON.stringify(createData));
    
    // 5. 保存到数据库
    const createResult = await db.collection('shop_spu').add({
      data: createData
    });
    
    console.log('数据库插入成功:', createResult);
    
    if (createResult._id) {
      return {
        code: 200,
        success: true,
        message: '商品添加成功',
        data: {
          _id: createResult._id,
          productId: createResult._id,
          name: createData.name,
          price: createData.price,
          stock: createData.stock,
          spec: createData.spec,
          category: createData.category,
          pay_status: createData.pay_status,
          status: createData.status === '1' ? '上架' : '下架'
        }
      };
    } else {
      return {
        code: 500,
        success: false,
        message: '数据库插入失败',
        data: null
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
