// 全局加载动画控制

/**
 * 显示品牌加载动画
 * @param {Object} page - 页面实例
 */
function showBrandLoading(page) {
  if (page) {
    page.setData({
      isLoading: true
    });
  }
}

/**
 * 隐藏品牌加载动画
 * @param {Object} page - 页面实例
 */
function hideBrandLoading(page) {
  if (page) {
    page.setData({
      isLoading: false
    });
  }
  // 停止下拉刷新动画（如果正在刷新）
  wx.stopPullDownRefresh();
}

/**
 * 显示品牌搜索加载动画
 * @param {Object} page - 页面实例
 */
function showSearchLoading(page) {
  if (page) {
    page.setData({
      isSearching: true
    });
  }
}

/**
 * 隐藏品牌搜索加载动画
 * @param {Object} page - 页面实例
 */
function hideSearchLoading(page) {
  if (page) {
    page.setData({
      isSearching: false
    });
  }
}

module.exports = {
  showBrandLoading,
  hideBrandLoading,
  showSearchLoading,
  hideSearchLoading
};