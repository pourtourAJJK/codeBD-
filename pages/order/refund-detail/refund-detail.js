Page({
  data: {
    orderId: '',
    refundInfo: null,
    loading: true
  },

  onLoad: function (options) {
    const orderId = options.orderId || options.order_id || '';
    this.setData({ orderId });
    this.loadRefundDetail();
  },

  onShow: function () {
    this.loadRefundDetail();
  },

  // 加载退款详情
  loadRefundDetail: async function () {
    if (!this.data.orderId) {
      wx.showToast({ title: '订单ID错误', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const db = wx.cloud.database();
      const res = await db.collection('shop_refund').where({
        order_id: this.data.orderId
      }).get();

      if (res.data.length > 0) {
        this.setData({ refundInfo: res.data[0] });
      } else {
        wx.showToast({ title: '未找到退款记录', icon: 'none' });
      }
    } catch (error) {
      console.error('加载退款详情失败:', error);
      wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 返回上一页
  goBack: function () {
    wx.navigateBack();
  }
});