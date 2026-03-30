Page({
  data: {
    orderId: '',
    item: {},
    transaction_id: '',
    totalAmount: 0,
    statusText: '',
    reasonText: '',
    desc: '',
    isSubmitting: false
  },

  onLoad() {
    const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel();
    eventChannel && eventChannel.on('refundData', (data) => {
      this.setData({
        orderId: data.orderId || '',
        item: data.item || {},
        transaction_id: data.transaction_id || '',
        totalAmount: data.totalAmount || 0
      });
    });
  },

  chooseStatus() {
    const options = ['未收到货', '已收到货'];
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        this.setData({ statusText: options[res.tapIndex] });
      }
    });
  },

  chooseReason() {
    const options = ['多拍/拍错/不想要', '快递一直未送到', '未按约定时间发货', '快递无跟踪记录', '空包裹/少货', '其他'];
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        this.setData({ reasonText: options[res.tapIndex] });
      }
    });
  },

  onDesc(e) {
    this.setData({ desc: e.detail.value || '' });
  },

  async submit() {
    if (!this.data.statusText) {
      wx.showToast({ title: '请选择收货状态', icon: 'none' });
      return;
    }
    if (!this.data.reasonText) {
      wx.showToast({ title: '请选择退款原因', icon: 'none' });
      return;
    }
    
    // 锁定提交状态，防止重复提交
    this.setData({ isSubmitting: true });

    try {
      // 调用微信支付退款云函数
      const refundResult = await wx.cloud.callFunction({
        name: 'wxpayFunctions',
        data: {
          type: 'wxpay_refund',
          orderId: this.data.orderId,
          transaction_id: this.data.transaction_id,
          out_refund_no: `REFUND_${this.data.orderId}_${Date.now()}`,
          refundFee: this.data.item.price * this.data.item.quantity,
          totalFee: this.data.totalAmount,
          reason: this.data.reasonText
        }
      });

      if (refundResult.result.code !== 200) {
        throw new Error(refundResult.result.message || '退款申请失败');
      }

      // 写入退款记录表 shop_refund
      const db = wx.cloud.database();
      const refundRecord = {
        order_id: this.data.orderId,
        out_refund_no: refundResult.result.out_refund_no,
        transaction_id: this.data.transaction_id,
        user_openid: wx.getStorageSync('openid'),
        reason: this.data.reasonText,
        refund_amount: this.data.item.price * this.data.item.quantity,
        refund_way: 'wechat',
        refund_status: 'refunding',
        goods_info: this.data.item,
        apply_time: db.serverDate(),
        handle_note: '',
        create_time: db.serverDate(),
        update_time: db.serverDate()
      };
      await db.collection('shop_refund').add({ data: refundRecord });

      // 更新订单状态为退款中
      await wx.cloud.callFunction({
        name: 'order-update-status',
        data: { orderId: this.data.orderId, status: 'refunding' }
      });

      // 更新本地缓存和页面栈状态
      const statusMap = wx.getStorageSync('refundStatusMap') || {};
      statusMap[this.data.orderId] = 'refunding';
      wx.setStorageSync('refundStatusMap', statusMap);

      // 通知所有相关页面更新状态
      const pages = getCurrentPages();
      // 更新订单详情页
      const detailPage = pages[pages.length - 3];
      if (detailPage && typeof detailPage.setData === 'function') {
        detailPage.setData({
          order: { ...(detailPage.data.order || {}), status: 'refunding', statusText: '退款中' },
          statusText: '退款中'
        });
      }
      // 更新订单列表页
      const orderListPage = pages.find(p => p.route === 'pages/order/order');
      if (orderListPage && Array.isArray(orderListPage.data.orders)) {
        const updated = orderListPage.data.orders.map(o => {
          const id = o.orderId || o.order_id || o.orderNo || o.out_trade_no || o._id;
          if (id === this.data.orderId) {
            return { ...o, statusmax: '7', statusText: '退款中', statusColor: '#e11' };
          }
          return o;
        });
        orderListPage.setData({ orders: updated });
      }

      // 退款申请成功提示
      wx.showToast({ title: '退款申请已提交', icon: 'success' });

      // 延迟返回，确保状态同步完成
      setTimeout(() => {
        wx.navigateBack({ delta: 2 });
      }, 800);

    } catch (error) {
      wx.showToast({ title: error.message || '退款申请失败', icon: 'none' });
    } finally {
      this.setData({ isSubmitting: false });
    }
  }
});


