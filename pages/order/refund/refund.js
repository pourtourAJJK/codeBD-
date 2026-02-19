const auth = require('../../../utils/auth');
Page({
  data: {
    orderId: '',
    item: {},
    selectAll: true
  },

  onLoad(options) {
    const orderId = options.orderId || '';
    this.setData({ orderId });
    this.loadOrder(orderId);
  },

  async loadOrder(orderId) {
    if (!orderId) return;
    if (!auth.isLoggedIn()) return;
    try {
      const res = await wx.cloud.callFunction({
        name: 'order-get',
        data: { orderId, order_id: orderId, orderNo: orderId, out_trade_no: orderId }
      });
      const raw = res.result?.data?.order || {};
      const first = (raw.goods || [])[0] || {};
      const item = {
        id: first.product_id || first.productId || first.id || 'sku',
        title: first.product_name || first.title || '待退款商品',
        spec: first.spec || first.sku_name || first.option || '',
        cover: first.cover_image || first.productImage || first.image || '/assets/images/default-product.png',
        priceYuan: this.formatPrice(first.price || first.sale_price || first.pay_price || raw.totalPrice || 0),
        quantity: first.quantity || first.num || 1
      };
      this.setData({ item });
    } catch (e) {
      console.error('load order fail', e);
    }
  },

  formatPrice(n) {
    const v = Number(n || 0);
    return v >= 1000 ? (v / 100).toFixed(2) : v.toFixed(2);
  },

  toggleSelectAll() {
    this.setData({ selectAll: !this.data.selectAll });
  },

  submit() {
    if (!this.data.selectAll) {
      wx.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }
    const { item, orderId } = this.data;
    wx.navigateTo({
      url: '/pages/order/refund-confirm/refund-confirm',
      success: (res) => {
        res.eventChannel?.emit('refundData', { orderId, item });
      }
    });
  }
});
