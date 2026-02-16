// 我的订单页面逻辑
Page({
  /**
   * 页面的初始数据
   */
  data: {
    activeTab: 'all', // all, pending, delivered, completed
    orders: [],
    tabList: [
      { key: 'all', name: '全部' },
      { key: 'pending', name: '待配送' },
      { key: 'delivered', name: '配送中' },
      { key: 'completed', name: '已完成' }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 加载订单列表
    this.loadOrders();
  },

  /**
   * 加载订单列表
   */
  loadOrders: function () {
    wx.cloud.callFunction({
      name: 'order-list',
      data: {
        status: this.data.activeTab !== 'all' ? this.data.activeTab : 'all',
        page: 1,
        pageSize: 20
      },
      success: res => {
        if (res.result.code === 200) {
          this.setData({
            orders: res.result.data?.orders || []
          });
        } else {
          console.error('获取订单失败:', res.result.message);
          wx.showToast({
            title: '获取订单失败',
            icon: 'none'
          });
        }
      },
      fail: error => {
        console.error('获取订单失败:', error);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 切换标签页
   */
  onTabChange: function (e) {
    const tabKey = e.currentTarget.dataset.key;
    this.setData({
      activeTab: tabKey
    });
    // 加载对应状态的订单
    this.loadOrders();
  },

  /**
   * 查看订单详情
   */
  viewOrderDetail: function (e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${orderId}`
    });
  },

  /**
   * 取消订单
   */
  cancelOrder: function (e) {
    const orderId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？',
      success: res => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'order-cancel',
            data: {
              orderId: orderId
            },
            success: res => {
              if (res.result.code === 200) {
                wx.showToast({
                  title: '订单已取消',
                  icon: 'success',
                  success: () => {
                    // 重新加载订单列表
                    this.loadOrders();
                  }
                });
              } else {
                wx.showToast({
                  title: '取消订单失败',
                  icon: 'none'
                });
              }
            },
            fail: error => {
              console.error('取消订单失败:', error);
              wx.showToast({
                title: '网络错误',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  /**
   * 确认收货
   */
  confirmReceipt: function (e) {
    const orderId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认收货',
      content: '确认已收到商品吗？',
      success: res => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'order-confirm-receipt',
            data: {
              orderId: orderId
            },
            success: res => {
              if (res.result.code === 200) {
                wx.showToast({
                  title: '已确认收货',
                  icon: 'success',
                  success: () => {
                    // 重新加载订单列表
                    this.loadOrders();
                  }
                });
              } else {
                wx.showToast({
                  title: '确认收货失败',
                  icon: 'none'
                });
              }
            },
            fail: error => {
              console.error('确认收货失败:', error);
              wx.showToast({
                title: '网络错误',
                icon: 'none'
              });
            }
          });
        }
      }
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