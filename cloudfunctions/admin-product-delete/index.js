// 管理员商品删除云函数
const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库实例
const db = cloud.database();
const _ = db.command;

/**
 * 管理员删除商品
 * @param {Object} event - 事件参数
 * @param {string} event.productId - 商品ID
 * @returns {Object} - 删除结果
 */
const handler = async (event, context) => {
  try {
    // 1. 接收前端传的 token
    const { adminToken, productId } = event;

    // 2. 没有 token → 直接返回空（权限拦截）
    if (!adminToken) {
      return {
        code: 401,
        message: '未登录',
        data: null
      };
    }

    // 3. 参数验证
    if (!productId) {
      return {
        code: 400,
        message: '商品ID不能为空',
        data: null
      };
    }
    
    // 4. 有权限 → 操作数据库
    // 删除商品
    const deleteResult = await db.collection('shop_spu').doc(productId).remove();
    
    if (deleteResult.stats && deleteResult.stats.removed > 0) {
      return {
        code: 200,
        message: '删除商品成功',
        data: {
          success: true,
          message: '商品删除成功'
        }
      };
    } else {
      return {
        code: 404,
        message: '商品不存在或删除失败',
        data: {
          success: false,
          message: '商品不存在或删除失败'
        }
      };
    }
  } catch (error) {
    console.error('删除商品失败:', error);
    return {
      code: 500,
      message: '删除商品失败，请稍后重试',
      data: {
        success: false,
        message: '删除商品失败'
      }
    };
  }
};

exports.main = handler;