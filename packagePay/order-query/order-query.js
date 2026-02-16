// 订单查询页面逻辑
Page({
  data: {
    orderId: '',
    orderInfo: null,
    loading: false
  },

  onLoad: function(options) {
    console.log('=== 订单查询页面加载 ===');
    if (options.orderId) {
      this.setData({
        orderId: options.orderId
      });
      // 自动查询订单
      this.queryOrder();
    }
  },

  // 返回上一页
  navigateBack: function() {
    wx.navigateBack();
  },

  // 查询订单
  queryOrder: function() {
    if (!this.data.orderId) {
      wx.showToast({
        title: '订单ID不能为空',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    // 调用订单查询云函数
    wx.cloud.callFunction({
      name: 'wxpayFunctions',
      data: {
        type: 'wxpay_query_order_by_out_trade_no',
        out_trade_no: this.data.orderId
      },
      success: res => {
        this.setData({ loading: false });
        if (res.result.code === 0) {
          this.setData({
            orderInfo: res.result.data
          });
        } else {
          wx.showToast({
            title: res.result.msg || '订单查询失败',
            icon: 'none'
          });
        }
      },
      fail: error => {
        this.setData({ loading: false });
        console.error('订单查询失败:', error);
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      }
    });
  }
});