// 微信支付JSAPI统一下单功能 - 前端调起支付示例
// 完整的支付流程：
// 1. 用户选择商品
// 2. 点击支付按钮
// 3. 调用payOrder云函数创建支付订单
// 4. 云函数内部调用wxpayFunctions生成支付参数
// 5. 前端接收支付参数并调用wx.requestPayment
// 6. 处理支付结果

Page({
  data: {
    // 商品信息
    product: {
      name: '测试商品',
      price: 0.01, // 1分钱，仅用于测试
      description: '这是一个测试商品，用于微信支付功能测试'
    },
    
    // 支付状态
    payStatus: 'INIT', // INIT: 初始状态, PAYING: 支付中, SUCCESS: 支付成功, FAILED: 支付失败
    payMessage: '',
    
    // 加载状态
    loading: false,
    
    // 支付结果
    payResult: null
  },

  onLoad() {
    console.log('=== 支付页面加载 ===');
    this.checkLoginStatus();
  },

  /**
   * 检查登录状态
   * 确保用户已登录，获取openid用于支付
   */
  checkLoginStatus() {
    console.log('=== 检查登录状态 ===');
    
    wx.cloud.callFunction({
      name: 'util-get-openid',
      data: {}
    }).then(res => {
      console.log('获取openid成功:', res.result.data?.openid);
      this.setData({
        openid: res.result.data?.openid
      });
    }).catch(err => {
      console.error('获取openid失败:', err);
      wx.showToast({
        title: '登录失败，请重新进入页面',
        icon: 'none',
        duration: 2000
      });
    });
  },

  /**
   * 生成订单号
   * @returns {string} 唯一的订单号
   */
  generateOrderId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `ORDER_${timestamp}_${random}`;
  },

  /**
   * 发起支付
   */
  async handlePay() {
    console.log('=== 开始发起支付 ===');
    
    if (!this.data.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    this.setData({
      loading: true,
      payStatus: 'PAYING',
      payMessage: '正在创建支付订单...'
    });

    try {
      // 1. 生成订单号
      const orderId = this.generateOrderId();
      console.log('生成订单号:', orderId);

      // 2. 调用payOrder云函数创建支付订单
      console.log('=== 调用payOrder云函数 ===');
      const payOrderResult = await wx.cloud.callFunction({
        name: 'pay-create',
        data: {
          orderId: orderId,
          productId: 'test_product',
          quantity: 1,
          amount: this.data.product.price,
          description: this.data.product.description
        }
      });

      console.log('pay-create云函数调用结果:', payOrderResult);

      if (payOrderResult.result.code !== 200) {
        throw new Error(`创建支付订单失败: ${payOrderResult.result.message}`);
      }

      const payData = payOrderResult.result.data.payData;
      console.log('获取到的支付参数:', payData);

      // 4. 检查是否包含前端支付参数
      if (!payData.payment_params) {
        throw new Error('支付参数不完整，缺少payment_params');
      }

      const paymentParams = payData.payment_params;
      console.log('前端支付参数:', paymentParams);

      // 5. 调用wx.requestPayment调起微信支付
      console.log('=== 调用wx.requestPayment ===');
      this.setData({
        payMessage: '正在调起微信支付...'
      });

      await this.requestPayment(paymentParams);

      // 6. 支付成功
      this.setData({
        payStatus: 'SUCCESS',
        payMessage: '支付成功！',
        payResult: {
          orderId: orderId,
          amount: this.data.product.price,
          time: new Date().toLocaleString()
        }
      });

      wx.showToast({
        title: '支付成功',
        icon: 'success',
        duration: 2000
      });

    } catch (error) {
      console.error('支付失败:', error);
      this.setData({
        payStatus: 'FAILED',
        payMessage: `支付失败: ${error.message}`
      });

      wx.showToast({
        title: `支付失败: ${error.message}`,
        icon: 'none',
        duration: 3000
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  /**
   * 调用wx.requestPayment调起微信支付
   * @param {Object} paymentParams 前端支付参数
   * @returns {Promise} 支付结果
   */
  requestPayment(paymentParams) {
    return new Promise((resolve, reject) => {
      wx.requestPayment({
        timeStamp: paymentParams.timeStamp,
        nonceStr: paymentParams.nonceStr,
        package: paymentParams.package,
        signType: paymentParams.signType,
        paySign: paymentParams.paySign,
        success: (res) => {
          console.log('微信支付成功:', res);
          resolve(res);
        },
        fail: (err) => {
          console.error('微信支付失败:', err);
          // 处理用户取消支付的情况
          if (err.errMsg === 'requestPayment:fail cancel') {
            reject(new Error('用户取消支付'));
          } else {
            reject(new Error(`微信支付失败: ${err.errMsg}`));
          }
        },
        complete: (res) => {
          console.log('微信支付调用完成:', res);
        }
      });
    });
  },

  /**
   * 重新发起支付
   */
  rePay() {
    this.setData({
      payStatus: 'INIT',
      payMessage: '',
      payResult: null
    });
    this.handlePay();
  },

  /**
   * 返回首页
   */
  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  /**
   * 复制订单号
   */
  copyOrderId() {
    if (this.data.payResult && this.data.payResult.orderId) {
      wx.setClipboardData({
        data: this.data.payResult.orderId,
        success: () => {
          wx.showToast({
            title: '订单号已复制',
            icon: 'success',
            duration: 1000
          });
        }
      });
    }
  }
});
