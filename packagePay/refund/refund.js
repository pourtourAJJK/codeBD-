// 退款页面逻辑
Page({
  data: {
    orderId: '',
    refundAmount: 0,
    refundReason: '',
    loading: false
  },

  onLoad: function(options) {
    console.log('=== 退款页面加载 ===');
    if (options.orderId) {
      this.setData({
        orderId: options.orderId
      });
    }
  },

  // 返回上一页
  navigateBack: function() {
    wx.navigateBack();
  },

  // 金额输入变化
  onAmountChange: function(e) {
    this.setData({
      refundAmount: parseFloat(e.detail.value) || 0
    });
  },

  // 退款原因输入变化
  onReasonChange: function(e) {
    this.setData({
      refundReason: e.detail.value
    });
  },

  // 提交退款申请
  submitRefund: function() {
    if (!this.data.orderId) {
      wx.showToast({
        title: '订单ID不能为空',
        icon: 'none'
      });
      return;
    }

    if (!this.data.refundReason) {
      wx.showToast({
        title: '请填写退款原因',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    // 调用退款云函数
    wx.cloud.callFunction({
      name: 'wxpayFunctions',
      data: {
        type: 'wxpay_refund',
        orderId: this.data.orderId,
        refundAmount: this.data.refundAmount,
        refundReason: this.data.refundReason
      },
      success: res => {
        this.setData({ loading: false });
        if (res.result.code === 200) {
          wx.showToast({
            title: '退款申请提交成功',
            icon: 'success'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: res.result.message || '退款申请失败',
            icon: 'none'
          });
        }
      },
      fail: error => {
        this.setData({ loading: false });
        console.error('退款申请失败:', error);
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      }
    });
  }
});