const { uploadUserLog } = require('../../../utils/log.js');

Page({
  data: {
    orderId: '',
    items: [],
    transaction_id: '',
    totalAmount: 0,
    refundAmount: 0,
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
        items: data.items || [],
        transaction_id: data.transaction_id || '',
        totalAmount: data.totalAmount || 0,
        refundAmount: data.refundAmount || 0
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
    const options = ['送得太慢/没送到', '送错地址/送错人', '商品破损/漏油/漏水', '发错货/数量不对', '退款/退货申请', '其他问题'];
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
      const refundFee = this.data.refundAmount;
      
      // 构建退款商品详情
      const refundItems = this.data.items.map(item => ({
        product_id: item.id,
        product_name: item.title,
        spec: item.spec,
        price: item.price,
        quantity: item.refundQuantity,
        subtotal: item.price * item.refundQuantity
      }));
      
      console.log(`[${new Date().toISOString()}] [前端-退款确认-创建退款申请] [订单ID:${orderId}] [退款单号:${outRefundNo}] 准备创建待审核记录`);

      // ✅ 新代码（调用云函数，安全规范）
      const res = await wx.cloud.callFunction({
        name: 'return-create', // 小程序专用退款申请接口
        data: {
          type: 'create_refund', // 退款申请类型
          order_id: this.data.orderId,
          reason: this.data.reasonText,
          transaction_id: this.data.transaction_id,
          refund_amount: refundFee,
          total_amount: this.data.totalAmount,
          user_openid: wx.getStorageSync('openid'),
          refund_items: refundItems
        }
      });

      console.log(`[${new Date().toISOString()}] [前端-退款确认-提交成功] [订单ID:${orderId}] [退款单号:${outRefundNo}] 退款申请已创建，等待商家审核`);

      // 退款申请成功后调用日志上传
      uploadUserLog({
        operate_module: 'refund', // 操作模块：退款
        operate_type: 'apply_refund', // 操作类型：申请退款
        relation_id: outRefundNo, // 退款数据标识（自动映射到relation_id2）
        operate_desc: `用户申请订单退款，退款金额：${this.data.refundAmount}元，操作结果：success`,
        fail_reason: ''
      });

      // 2. 提交成功 → 跳转到订单管理页
      wx.showToast({
        title: '退款申请已提交',
        icon: 'success'
      });
      setTimeout(() => {
        // 退回2级页面 → 直接回到订单页，保留完整页面栈
        wx.navigateBack({
          delta: 2
        });
      }, 1000);

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


