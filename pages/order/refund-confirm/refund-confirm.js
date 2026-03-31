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
      // 准备参数
      const transactionId = this.data.transaction_id;
      const outRefundNo = `REFUND_${this.data.orderId}_${Date.now()}`;
      const refundFee = this.data.item.price * this.data.item.quantity;
      
      console.log(`[${new Date().toISOString()}] [前端-退款确认-创建退款申请] [订单ID:${orderId}] [退款单号:${outRefundNo}] 准备创建待审核记录`);

      // 原自动退款代码 👉 全部删除/注释
      // wx.cloud.callFunction({ name: 'wxpayFunctions', ... })

      // 新代码：仅创建退款申请，状态=待审核
      const db = wx.cloud.database()
      await db.collection('shop_refund').add({ 
        data: { 
          order_id: this.data.orderId,           // 关联订单ID 
          out_refund_no: outRefundNo,  // 退款单号 
          transaction_id: this.data.transaction_id, 
          refund_amount: refundFee,    // 退款金额 
          total_amount: this.data.totalAmount,      // 订单总金额 
          reason: this.data.reasonText,              // 退款原因 
          // 核心：审核状态+退款状态 = 待审核 
          audit_status: "待审核", 
          refund_status: "待审核", 
          refund_result_status: "待退款", 
          apply_time: new Date(),                // 申请时间 
          user_openid: wx.getStorageSync('openid')      // 用户ID 
        } 
      })

      console.log(`[${new Date().toISOString()}] [前端-退款确认-提交成功] [订单ID:${orderId}] [退款单号:${outRefundNo}] 退款申请已创建，等待商家审核`);

      // 成功提示
      wx.showToast({ title: '退款申请已提交，等待商家审核', icon: 'success' })
      // 延迟跳回订单详情页
      setTimeout(() => {
        wx.navigateBack()
      }, 2000)

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


