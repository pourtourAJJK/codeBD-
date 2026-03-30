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
    const timestamp = new Date().toISOString();
    const orderId = this.data.orderId;
    console.log(`[${timestamp}] [前端-退款确认-提交开始] [订单ID:${orderId}] 启动退款申请`);

    if (!this.data.statusText) {
      wx.showToast({ title: '请选择收货状态', icon: 'none' });
      console.error(`[${new Date().toISOString()}] [前端-退款确认-参数校验] [订单ID:${orderId}] 缺失收货状态`);
      return;
    }
    if (!this.data.reasonText) {
      wx.showToast({ title: '请选择退款原因', icon: 'none' });
      console.error(`[${new Date().toISOString()}] [前端-退款确认-参数校验] [订单ID:${orderId}] 缺失退款原因`);
      return;
    }

    console.log(`[${new Date().toISOString()}] [前端-退款确认-参数校验] [订单ID:${orderId}] 参数校验通过`);
    
    // 锁定提交状态，防止重复提交
    this.setData({ isSubmitting: true });

    try {
      // 准备云函数参数
      const transactionId = this.data.transaction_id;
      const maskedTransactionId = transactionId ? transactionId.substring(0, 10) + '...' : '未提供';
      const outRefundNo = `REFUND_${this.data.orderId}_${Date.now()}`;
      const refundFee = this.data.item.price * this.data.item.quantity;
      
      console.log(`[${new Date().toISOString()}] [前端-退款确认-云函数调用] [订单ID:${orderId}] [退款单号:${outRefundNo}] 准备调用wxpayFunctions`);
      console.log(`[${new Date().toISOString()}] [前端-退款确认-参数详情] [订单ID:${orderId}] 支付单号:${maskedTransactionId}, 退款金额:${refundFee}, 订单总金额:${this.data.totalAmount}`);

      // 调用微信支付退款云函数
      const refundResult = await wx.cloud.callFunction({
        name: 'wxpayFunctions',
        data: {
          type: 'wxpay_refund',
          orderId: this.data.orderId,
          transaction_id: this.data.transaction_id,
          out_refund_no: outRefundNo,
          refundFee: refundFee,
          totalFee: this.data.totalAmount,
          reason: this.data.reasonText
        }
      });

      console.log(`[${new Date().toISOString()}] [前端-退款确认-云函数返回] [订单ID:${orderId}] wxpayFunctions返回`, refundResult);

      if (refundResult.result.code !== 200) {
        throw new Error(refundResult.result.message || '退款申请失败');
      }

      console.log(`[${new Date().toISOString()}] [前端-退款确认-退款表写入] [订单ID:${orderId}] [退款单号:${outRefundNo}] 开始写入shop_refund`);

      // 写入退款记录表 shop_refund
      const db = wx.cloud.database();
      const refundRecord = {
        order_id: this.data.orderId,
        out_refund_no: refundResult.result.out_refund_no || outRefundNo,
        transaction_id: this.data.transaction_id,
        user_openid: wx.getStorageSync('openid'),
        reason: this.data.reasonText,
        refund_amount: refundFee,
        refund_way: 'wechat',
        refund_status: 'refunding',
        goods_info: this.data.item,
        apply_time: db.serverDate(),
        handle_note: '',
        create_time: db.serverDate(),
        update_time: db.serverDate()
      };
      
      const addRefundResult = await db.collection('shop_refund').add({ data: refundRecord });
      console.log(`[${new Date().toISOString()}] [前端-退款确认-退款表写入] [订单ID:${orderId}] shop_refund写入成功,记录ID:`, addRefundResult._id);

      console.log(`[${new Date().toISOString()}] [前端-退款确认-订单状态更新] [订单ID:${orderId}] 准备调用order-update-status`);

      // 更新订单状态为退款中
      const updateStatusResult = await wx.cloud.callFunction({
        name: 'order-update-status',
        data: { orderId: this.data.orderId, statusmax: '7', status: 'refunding' }
      });

      console.log(`[${new Date().toISOString()}] [前端-退款确认-订单状态更新] [订单ID:${orderId}] order-update-status返回`, updateStatusResult);

      // 更新本地缓存和页面栈状态
      const statusMap = wx.getStorageSync('refundStatusMap') || {};
      statusMap[this.data.orderId] = 'refunding';
      wx.setStorageSync('refundStatusMap', statusMap);
      console.log(`[${new Date().toISOString()}] [前端-退款确认-缓存更新] [订单ID:${orderId}] 本地缓存refundStatusMap已更新`);

      // 通知所有相关页面更新状态
      const pages = getCurrentPages();
      // 更新订单详情页
      const detailPage = pages[pages.length - 3];
      if (detailPage && typeof detailPage.setData === 'function') {
        detailPage.setData({
          order: { ...(detailPage.data.order || {}), status: 'refunding', statusText: '退款中' },
          statusText: '退款中'
        });
        console.log(`[${new Date().toISOString()}] [前端-退款确认-页面更新] [订单ID:${orderId}] 订单详情页已更新`);
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
        console.log(`[${new Date().toISOString()}] [前端-退款确认-页面更新] [订单ID:${orderId}] 订单列表页已更新`);
      }

      console.log(`[${new Date().toISOString()}] [前端-退款确认-提交成功] [订单ID:${orderId}] [退款单号:${outRefundNo}] 退款申请全流程完成`);

      // 退款申请成功提示
      wx.showToast({ title: '退款申请已提交', icon: 'success' });

      // 延迟返回，确保状态同步完成
      setTimeout(() => {
        wx.navigateBack({ delta: 2 });
      }, 800);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [前端-退款确认-异常] [订单ID:${orderId}] 退款申请失败`);
      console.error(`[${new Date().toISOString()}] [前端-退款确认-异常详情] [订单ID:${orderId}] 错误信息:`, error.message);
      console.error(`[${new Date().toISOString()}] [前端-退款确认-异常详情] [订单ID:${orderId}] 错误堆栈:`, error.stack);
      wx.showToast({ title: error.message || '退款申请失败', icon: 'none' });
    } finally {
      this.setData({ isSubmitting: false });
      console.log(`[${new Date().toISOString()}] [前端-退款确认-提交结束] [订单ID:${orderId}] 退款申请流程结束`);
    }
  }
});


