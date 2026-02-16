// wxUtil.js - 微信小程序工具函数

/**
 * 显示加载提示
 * @param {string} title - 提示文字
 * @param {boolean} mask - 是否显示透明蒙层
 */
exports.showLoading = (title = '加载中...', mask = true) => {
  wx.showLoading({
    title,
    mask
  });
};

/**
 * 隐藏加载提示
 */
exports.hideLoading = () => {
  wx.hideLoading();
};

/**
 * 显示消息提示
 * @param {Object} options - 配置项
 */
exports.showToast = (options) => {
  wx.showToast({
    title: '提示',
    icon: 'none',
    duration: 2000,
    ...options
  });
};

/**
 * 显示模态对话框
 * @param {Object} options - 配置项
 */
exports.showModal = (options) => {
  return new Promise((resolve) => {
    wx.showModal({
      title: '提示',
      content: '',
      showCancel: true,
      cancelText: '取消',
      cancelColor: '#000000',
      confirmText: '确定',
      confirmColor: '#576B95',
      success: resolve,
      ...options
    });
  });
};

/**
 * 显示操作菜单
 * @param {Object} options - 配置项
 */
exports.showActionSheet = (options) => {
  return new Promise((resolve, reject) => {
    wx.showActionSheet({
      itemList: [],
      success: resolve,
      fail: reject,
      ...options
    });
  });
};

/**
 * 导航跳转
 * @param {string} url - 跳转地址
 */
exports.navigateTo = (url) => {
  wx.navigateTo({ url });
};

/**
 * 重定向跳转
 * @param {string} url - 跳转地址
 */
exports.redirectTo = (url) => {
  wx.redirectTo({ url });
};

/**
 * 关闭所有页面跳转
 * @param {string} url - 跳转地址
 */
exports.reLaunch = (url) => {
  wx.reLaunch({ url });
};

/**
 * 返回上一页
 * @param {number} delta - 返回的页面数
 */
exports.navigateBack = (delta = 1) => {
  wx.navigateBack({ delta });
};