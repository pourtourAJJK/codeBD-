// 家庭页面 JS
Page({
  data: {
    // 页面数据
  },

  onLoad() {
    console.log('家庭页面加载');
  },

  // 返回上一页
  navigateBack() {
    wx.navigateBack({
      delta: 1
    });
  }
});