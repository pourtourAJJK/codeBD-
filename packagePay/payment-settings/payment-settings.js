// 支付设置页面逻辑
Page({
  data: {
    paymentMethods: [
      {
        id: 'wechat',
        name: '微信支付',
        icon: '/assets/images/wechat.png',
        enabled: true
      },
      {
        id: 'balance',
        name: '余额支付',
        icon: '/assets/images/balance.png',
        enabled: true
      }
    ],
    defaultPayment: 'wechat'
  },

  onLoad: function() {
    console.log('=== 支付设置页面加载 ===');
  },

  // 返回上一页
  navigateBack: function() {
    wx.navigateBack();
  },

  // 选择默认支付方式
  selectPayment: function(e) {
    const paymentId = e.currentTarget.dataset.id;
    this.setData({
      defaultPayment: paymentId
    });
  },

  // 切换支付方式状态
  togglePayment: function(e) {
    const paymentId = e.currentTarget.dataset.id;
    const paymentMethods = this.data.paymentMethods.map(method => {
      if (method.id === paymentId) {
        return { ...method, enabled: !method.enabled };
      }
      return method;
    });
    this.setData({ paymentMethods });
  },

  // 保存设置
  saveSettings: function() {
    wx.showToast({
      title: '设置保存成功',
      icon: 'success'
    });
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  }
});