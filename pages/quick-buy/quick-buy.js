// 快速购水页面逻辑
Page({
  /**
   * 页面的初始数据
   */
  data: {
    products: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 加载快速购水商品
    this.loadProducts();
  },

  /**
   * 加载商品数据
   */
  loadProducts: function () {
    try {
      // 调用云函数获取商品列表
      wx.cloud.callFunction({
        name: 'product-list',
        data: {
          page: 1,
          pageSize: 20
        },
        success: res => {
          if (res.result.code === 200) {
            this.setData({
              products: res.result.data?.products || []
            });
          } else {
            console.error('获取商品失败:', res.result.message);
            wx.showToast({
              title: '获取商品失败',
              icon: 'none'
            });
          }
        },
        fail: error => {
          console.error('获取商品失败:', error);
          wx.showToast({
            title: '网络错误',
            icon: 'none'
          });
        }
      });
    } catch (error) {
      console.error('加载商品异常:', error);
      wx.showToast({
        title: '加载异常',
        icon: 'none'
      });
    }
  },

  /**
   * 跳转到商品详情页
   */
  onProductClick: function (e) {
    const productId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/shop/detail/detail?id=${productId}`
    });
  },

  /**
   * 返回首页
   */
  onBackHome: function () {
    wx.navigateBack({
      delta: 1
    });
  }
});