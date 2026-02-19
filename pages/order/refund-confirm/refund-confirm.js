Page({
  data: {
    orderId: '',
    item: {},
    statusText: '',
    reasonText: '',
    desc: ''
  },

  onLoad() {
    const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel();
    eventChannel && eventChannel.on('refundData', (data) => {
      this.setData({
        orderId: data.orderId || '',
        item: data.item || {}
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

  submit() {
    if (!this.data.statusText) {
      wx.showToast({ title: '请选择收货状态', icon: 'none' });
      return;
    }
    if (!this.data.reasonText) {
      wx.showToast({ title: '请选择退款原因', icon: 'none' });
      return;
    }
    // 更新订单状态为退款中
    wx.cloud.callFunction({
      name: 'order-update-status',
      data: { orderId: this.data.orderId, status: 'refunding' },
      success: () => {
        // 记忆状态，用于列表/详情 onShow 同步
        const statusMap = wx.getStorageSync('refundStatusMap') || {};
        statusMap[this.data.orderId] = 'refunding';
        wx.setStorageSync('refundStatusMap', statusMap);

        // 即时更新页面栈中的订单详情/列表显示为退款中
        const pages = getCurrentPages();
        // 当前: refund-confirm; 上一页: refund; 上上一页: detail (如存在)
        const detailPage = pages[pages.length - 3];
        if (detailPage && typeof detailPage.setData === 'function') {
          detailPage.setData({
            order: { ...(detailPage.data.order || {}), status: 'refunding' },
            statusText: '退款中'
          });
        }
        const orderListPage = pages.find(p => p.route === 'pages/order/order');
        if (orderListPage && Array.isArray(orderListPage.data.orders)) {
          const updated = orderListPage.data.orders.map(o => {
            const id = o.orderId || o.order_id || o.orderNo || o.out_trade_no || o._id;
            if (id === this.data.orderId) {
              return { ...o, status: 'refunding', statusText: '退款中', statusColor: '#e11' };
            }
            return o;
          });
          orderListPage.setData({ orders: updated });
        }
      },
      complete: () => {
        wx.showToast({ title: '已提交退款申请', icon: 'success' });
        setTimeout(() => wx.navigateBack({ delta: 2 }), 800);
      }
    });

  }
});


