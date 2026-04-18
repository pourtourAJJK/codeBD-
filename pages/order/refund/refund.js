const auth = require('../../../utils/auth');
Page({
  data: {
    orderId: '',
    order: {},
    items: [],
    selectAll: true,
    totalRefundAmount: '0.00'
  },

  async onLoad(options) {
    const orderId = options.orderId || '';
    this.setData({ orderId });
    
    // 查询订单是否已有退款记录
    const db = wx.cloud.database();
    const res = await db.collection('shop_refund').where({
      order_id: orderId,
      // 只要不是拒绝状态，都禁止重新申请
      refund_status: db.command.neq("审核拒绝")
    }).get();
    if(res.data.length > 0){
      wx.showToast({ title: '该订单已申请退款', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 2000);
      return;
    }
    
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
      const goods = raw.goods || [];
      
      // 处理所有商品
      const items = goods.map((good, index) => {
        const price = Number(good.price || good.sale_price || good.pay_price || 0);
        const quantity = good.quantity || good.num || 1;
        return {
          id: good.product_id || good.productId || good.id || `sku_${index}`,
          title: good.product_name || good.title || '待退款商品',
          spec: good.spec || good.sku_name || good.option || '',
          cover: good.cover_image || good.productImage || good.image || '/assets/images/default-product.png',
          price: price,
          priceYuan: this.formatPrice(price),
          quantity: quantity,
          selected: true,
          refundQuantity: quantity,
          subtotal: this.formatPrice(price * quantity)
        };
      });
      
      this.setData({ items, order: raw });
      this.calculateTotal();
    } catch (e) {
      console.error('load order fail', e);
    }
  },

  formatPrice(n) {
    const v = Number(n || 0);
    return v >= 1000 ? (v / 100).toFixed(2) : v.toFixed(2);
  },

  toggleSelectAll() {
    const selectAll = !this.data.selectAll;
    const items = this.data.items.map(item => ({
      ...item,
      selected: selectAll,
      refundQuantity: selectAll ? item.quantity : 0
    }));
    this.setData({ selectAll, items });
    this.calculateTotal();
  },

  onCheckboxChange(e) {
    const selectedValues = e.detail.value || [];
    const items = this.data.items.map(item => ({
      ...item,
      selected: selectedValues.includes(item.id),
      refundQuantity: selectedValues.includes(item.id) ? item.quantity : 0
    }));
    const selectAll = selectedValues.length === items.length;
    this.setData({ items, selectAll });
    this.calculateTotal();
  },

  decreaseQuantity(e) {
    const index = e.currentTarget.dataset.index;
    const items = [...this.data.items];
    if (items[index].refundQuantity > 1) {
      items[index].refundQuantity--;
      items[index].subtotal = this.formatPrice(items[index].price * items[index].refundQuantity);
      this.setData({ items });
      this.calculateTotal();
    }
  },

  increaseQuantity(e) {
    const index = e.currentTarget.dataset.index;
    const items = [...this.data.items];
    if (items[index].refundQuantity < items[index].quantity) {
      items[index].refundQuantity++;
      items[index].subtotal = this.formatPrice(items[index].price * items[index].refundQuantity);
      this.setData({ items });
      this.calculateTotal();
    }
  },

  onQuantityInput(e) {
    const index = e.currentTarget.dataset.index;
    let value = parseInt(e.detail.value) || 1;
    const items = [...this.data.items];
    const maxQuantity = items[index].quantity;
    value = Math.max(1, Math.min(value, maxQuantity));
    items[index].refundQuantity = value;
    items[index].subtotal = this.formatPrice(items[index].price * value);
    this.setData({ items });
    this.calculateTotal();
  },

  calculateTotal() {
    const total = this.data.items.reduce((sum, item) => {
      if (item.selected) {
        return sum + item.price * item.refundQuantity;
      }
      return sum;
    }, 0);
    this.setData({ totalRefundAmount: this.formatPrice(total) });
  },

  submit() {
    const selectedItems = this.data.items.filter(item => item.selected);
    if (selectedItems.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }
    
    const { orderId, order } = this.data;
    const totalRefundAmount = parseFloat(this.data.totalRefundAmount);
    
    wx.navigateTo({
      url: '/pages/order/refund-confirm/refund-confirm',
      success: (res) => {
        res.eventChannel?.emit('refundData', {
          orderId,
          items: selectedItems,
          transaction_id: order.transaction_id || order.transactionId,
          totalAmount: order.totalPrice || order.total_amount || order.paymentAmount,
          refundAmount: totalRefundAmount
        });
      }
    });
  }
});
