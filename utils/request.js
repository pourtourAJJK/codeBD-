/**
 * 网络请求封装
 */
const { showLoading, hideLoading, showToast } = require('./wxUtil');
const { config: envConfig } = require('../config/env');
const API_BASE_URL = envConfig.API_BASE_URL;

// 请求队列
let requestQueue = [];

/**
 * 请求拦截器配置
 */
const requestInterceptor = (config) => {
  // 显示loading
  if (config.loading) {
    showLoading(config.loadingText || '加载中...');
  }
  
  // 添加请求头
  if (!config.header) {
    config.header = {};
  }
  
  // 添加用户token
  const token = wx.getStorageSync('token');
  if (token) {
    config.header['Authorization'] = `Bearer ${token}`;
  }
  
  // 添加请求时间戳
  config.header['X-Request-Time'] = Date.now().toString();
  
  // 添加请求队列
  requestQueue.push(config.url);
  
  return config;
};

/**
 * 响应拦截器配置
 */
const responseInterceptor = (response) => {
  // 隐藏loading
  hideLoading();
  
  // 从请求队列中移除
  const index = requestQueue.indexOf(response.config.url);
  if (index > -1) {
    requestQueue.splice(index, 1);
  }
  
  // 处理响应数据
  const { data, statusCode } = response;
  
  if (statusCode === 200) {
    if (data.success || data.code === 0) {
      return data;
    } else {
      // 业务错误处理
      showToast({
        title: data.message || '请求失败',
        icon: 'none'
      });
      return Promise.reject(data);
    }
  } else {
    // HTTP错误处理
    const errorMessage = getErrorMessage(statusCode);
    showToast({
      title: errorMessage,
      icon: 'none'
    });
    return Promise.reject({ statusCode, message: errorMessage });
  }
};

/**
 * 错误处理
 */
const errorHandler = (error) => {
  // 隐藏loading
  hideLoading();
  
  // 网络错误处理
  if (error.errMsg) {
    showToast({
      title: '网络错误，请检查网络连接',
      icon: 'none'
    });
  }
  
  console.error('请求错误:', error);
  return Promise.reject(error);
};

/**
 * 获取错误消息
 */
const getErrorMessage = (statusCode) => {
  const errorMessages = {
    400: '请求参数错误',
    401: '未授权，请重新登录',
    403: '拒绝访问',
    404: '请求地址不存在',
    405: '请求方法错误',
    408: '请求超时',
    500: '服务器内部错误',
    501: '服务未实现',
    502: '网关错误',
    503: '服务不可用',
    504: '网关超时'
  };
  
  return errorMessages[statusCode] || `请求失败(${statusCode})`;
};

/**
 * 请求重试机制
 */
const retryRequest = (config, retryCount = 0, maxRetry = 3) => {
  return new Promise((resolve, reject) => {
    wx.request({
      ...config,
      success: resolve,
      fail: (error) => {
        if (retryCount < maxRetry) {
          // 重试请求
          setTimeout(() => {
            retryRequest(config, retryCount + 1, maxRetry).then(resolve).catch(reject);
          }, 1000 * Math.pow(2, retryCount)); // 指数退避策略
        } else {
          reject(error);
        }
      }
    });
  });
};

/**
 * 封装的请求函数
 */
const request = (options) => {
  // 默认配置
  const defaultOptions = {
    url: '',
    method: 'GET',
    data: {},
    header: {},
    loading: true,
    loadingText: '加载中...',
    retry: false,
    maxRetry: 3
  };
  
  // 合并配置
  const config = { ...defaultOptions, ...options };
  
  // 处理绝对路径和相对路径
  if (config.url.indexOf('http') !== 0) {
    config.url = API_BASE_URL + config.url;
  }
  
  // 请求拦截
  const processedConfig = requestInterceptor(config);
  
  // 发起请求
  const requestPromise = config.retry 
    ? retryRequest(processedConfig, 0, config.maxRetry)
    : new Promise((resolve, reject) => {
        wx.request({
          ...processedConfig,
          success: resolve,
          fail: reject
        });
      });
  
  // 响应处理
  return requestPromise
    .then(response => responseInterceptor({
      ...response,
      config: processedConfig
    }))
    .catch(errorHandler);
};

/**
 * GET请求
 */
const get = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'GET',
    data,
    ...options
  });
};

/**
 * POST请求
 */
const post = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  });
};

/**
 * PUT请求
 */
const put = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  });
};

/**
 * DELETE请求
 */
const del = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'DELETE',
    data,
    ...options
  });
};

/**
 * 云函数调用
 */
const callCloudFunction = (name, data = {}, options = {}) => {
  return new Promise((resolve, reject) => {
    // 显示loading
    if (options.loading !== false) {
      showLoading(options.loadingText || '加载中...');
    }
    
    // 检查name参数是否存在
    if (!name) {
      console.error('云函数名称不能为空');
      hideLoading();
      showToast({
        title: '云函数名称不能为空',
        icon: 'none'
      });
      reject(new Error('云函数名称不能为空'));
      return;
    }
    
    console.log('调用云函数:', name, '参数:', data);
    
    wx.cloud.callFunction({
      name,
      data,
      success: (result) => {
        hideLoading();
        
        console.log('云函数调用成功:', name, '结果:', result);
        
        const { result: data } = result;
        // 兼容 {success: true}、{code: 200} 三种格式
        if (data.success || data.code === 200) {
          resolve(data);
        } else {
          const errorMsg = data.message || data.msg || '云函数调用失败';
          console.error('云函数调用失败:', name, '错误:', errorMsg);
          showToast({
            title: errorMsg,
            icon: 'none'
          });
          reject(data);
        }
      },
      fail: (error) => {
        hideLoading();
        console.error('云函数调用失败:', name, '错误:', error);
        showToast({
          title: '云函数调用失败',
          icon: 'none'
        });
        reject(error);
      }
    });
  });
};

/**
 * 取消所有请求
 */
const cancelAllRequests = () => {
  requestQueue = [];
};

module.exports = {
  request,
  get,
  post,
  put,
  del,
  callCloudFunction,
  cancelAllRequests
};