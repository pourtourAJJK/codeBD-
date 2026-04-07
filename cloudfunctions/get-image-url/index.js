// 获取图片临时访问链接云函数
const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 获取图片临时访问链接
 * @param {Object} event - 事件参数
 * @param {Array} event.fileList - 图片云存储路径数组
 * @returns {Object} - 临时访问链接结果
 */
const handler = async (event, context) => {
  try {
    const { fileList } = event;
    
    // 参数验证
    if (!fileList || !Array.isArray(fileList) || fileList.length === 0) {
      return {
        code: 400,
        message: '文件列表不能为空',
        data: null
      };
    }
    
    // 获取临时访问链接
    const result = await cloud.getTempFileURL({
      fileList: fileList
    });
    
    return {
      code: 200,
      message: '获取临时访问链接成功',
      data: result.fileList
    };
  } catch (error) {
    console.error('获取临时访问链接失败:', error);
    return {
      code: 500,
      message: '获取临时访问链接失败，请稍后重试',
      data: null
    };
  }
};

exports.main = handler;

