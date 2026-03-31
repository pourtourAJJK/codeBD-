Page({
  data: {
    refundInfo: null,
    loading: true,
    // 状态映射（复用statusmax，不新增字段）
    statusMap: {
      6: "已取消（退款审核拒绝）",
      7: "待退款（审核通过）",
      8: "退款失败",
      9: "退款成功"
    }
  },

  onLoad: function (options) {
    const refundId = options.id || options.refundId || '';
    if (refundId) {
      this.getRefundDetail(refundId);
    } else {
      const orderId = options.orderId || options.order_id || '';
      this.loadRefundByOrderId(orderId);
    }
  },

  onShow: function () {
    const refundId = this.data.refundInfo?._id;
    if (refundId) {
      this.getRefundDetail(refundId);
    }
  },

  // 根据退款ID获取退款详情
  async getRefundDetail(refundId) {
    if (!refundId) {
      wx.showToast({ title: '退款ID错误', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const db = wx.cloud.database();
      const res = await db.collection('shop_refund').doc(refundId).get();
      if (res.data) {
        this.setData({ refundInfo: res.data });
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

  // 根据订单ID获取退款详情
  async loadRefundByOrderId(orderId) {
    if (!orderId) {
      wx.showToast({ title: '订单ID错误', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const db = wx.cloud.database();
      const res = await db.collection('shop_refund').where({
        order_id: orderId
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