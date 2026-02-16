// 支付历史页面逻辑
Page({
  data: {
    paymentHistory: [],
    loading: false,
    page: 1,
    pageSize: 10,
    hasMore: true
  },

  onLoad: function() {
    console.log('=== 支付历史页面加载 ===');
    this.loadPaymentHistory();
  },

  // 返回上一页
  navigateBack: function() {
    wx.navigateBack();
  },

  // 加载支付历史
  loadPaymentHistory: function() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    // 模拟加载支付历史数据
    // 实际项目中应调用云函数获取数据
    setTimeout(() => {
      const mockData = [
        {
          orderId: '20260207001',
          amount: 19.9,
          time: '2026-02-07 12:30:00',
          status: 'SUCCESS'
        },
        {
          orderId: '20260207002',
          amount: 29.9,
          time: '2026-02-07 11:15:00',
          status: 'SUCCESS'
        }
      ];

      this.setData({
        paymentHistory: [...this.data.paymentHistory, ...mockData],
        loading: false,
        hasMore: false
      });
    }, 1000);
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.setData({
      paymentHistory: [],
      page: 1,
      hasMore: true
    });
    this.loadPaymentHistory();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom: function() {
    this.loadPaymentHistory();
  }
});