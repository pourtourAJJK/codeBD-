// 支付页面逻辑
const app = getApp();
const auth = require('../../utils/auth');
const orderUtil = require('../../utils/orderUtil');

// 新增：自动取消计时器句柄
let autoCancelTimer = null;

Page({
  data: {
    // 订单信息
    order: {
      orderId: '',
      createTime: '',
      totalPrice: 0
    },
    // 选中的支付方式
    selectedPayment: 'wechat',
    // 用户余额
    balance: 0,
    // 加载状态
    loading: false,
    // 支付结果弹窗
    showResultModal: false,
    // 支付结果
    paymentResult: false,
    // 结果提示信息
    resultMessage: ''
  },

  // 页面加载
  onLoad: function(options) {
    // 检查用户登录状态
    if (!auth.isLoggedIn()) {
      wx.navigateTo({
        url: '/pages/auth/login/login'
      });
      return;
    }
    
    console.log('=== 支付页面加载开始 ===');
    
    // 日志辅助排查：打印接收到的url参数
    console.log('【支付页面日志0】接收到的url参数:', options);
    
    // 【修复点1：三层兜底获取订单核心参数】
    let orderId = '';
    let productId = '';
    let quantity = 1;
    let totalPrice = 0;
    
    // 方式1 - 从url参数获取
    if (options.orderId) {
      orderId = options.orderId;
      productId = options.productId || '';
      quantity = parseInt(options.quantity) || 1;
      totalPrice = parseFloat(options.totalPrice) || 0;
      console.log('【支付页面日志0.1】从url参数获取的订单信息:', { orderId, productId, quantity, totalPrice });
    }
    
    // 方式2 - 从事件通道获取
    // 【修复点2：eventChannel.on 函数检查】
    const eventChannel = this.getOpenerEventChannel();
    console.log('【支付页面日志0.1.5】支付页获取的eventChannel：', eventChannel);
    console.log('【支付页面日志0.1.6】eventChannel.on类型：', typeof eventChannel?.on);
    
    if (eventChannel && typeof eventChannel.on === 'function') {
      eventChannel.on('acceptOrderData', (data) => {
        console.log('【支付页面日志0.2】从事件通道获取的订单数据:', data);
        if (data.orderId) {
          orderId = data.orderId;
          productId = data.productId || productId;
          quantity = data.quantity || quantity;
          totalPrice = data.totalPrice || totalPrice;
          this.setData({
            order: {
              ...this.data.order,
              orderId: orderId,
              productId: productId,
              quantity: quantity,
              totalPrice: totalPrice
            }
          });
          
          // 【修复点3：订单存在性校验】获取到订单ID后立即校验
          this.checkOrderExist(orderId);
        }
      });
    } else {
      console.log('【支付页面日志0.2.1】eventChannel无效或不支持on方法，跳过事件监听');
    }
    
    // 方式3 - 从页面栈获取（兜底）
    const pages = getCurrentPages();
    if (pages.length > 1) {
      const prevPage = pages[pages.length - 2];
      if (prevPage?.data?.order?.orderId) {
        orderId = prevPage.data.order.orderId;
        productId = prevPage.data.order.productId || productId;
        quantity = prevPage.data.order.quantity || quantity;
        totalPrice = prevPage.data.order.totalPrice || totalPrice;
        console.log('【支付页面日志0.3】从页面栈获取的订单信息:', { orderId, productId, quantity, totalPrice });
        
        this.setData({
          order: {
            ...this.data.order,
            orderId: orderId,
            productId: productId,
            quantity: quantity,
            totalPrice: totalPrice
          }
        });
      }
    }
    
    // 【修复点3：订单存在性校验】如果从URL参数获取到orderId，立即校验
    if (orderId) {
      this.checkOrderExist(orderId);
    }
    
    // 加载订单信息
    if (orderId) {
      this.loadOrderInfo(orderId);
    } else {
      console.error('【支付页面日志错误】无法获取orderId，支付流程终止');
      wx.showToast({
        title: '订单信息异常',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        wx.navigateBack({ delta: 1 });
      }, 2000);
    }
    
    // 加载用户余额
    this.loadUserBalance();
    
    console.log('=== 支付页面加载完成 ===');
  },
  
  // 【修复点3：订单存在性校验】
  checkOrderExist: function(orderId) {
    console.log('【支付页面日志】开始检查订单是否存在:', orderId);
    
    wx.cloud.callFunction({
      name: 'pay-create',
      data: {
        action: 'checkOrderExist',
        orderId: orderId
      },
      success: (res) => {
        console.log('【支付页面日志】订单存在性校验结果:', res.result);
        
        if (res.result.code === 200) {
          if (!res.result.data?.exist) {
            console.error('【支付页面日志】订单不存在:', orderId);
            wx.showToast({
              title: '订单不存在，请重新下单',
              icon: 'none',
              duration: 2000
            });
            
            // 2秒后返回上一页
            setTimeout(() => {
              wx.navigateBack({ delta: 1 });
            }, 2000);
          } else {
            console.log('【支付页面日志】订单存在性校验通过:', orderId);
          }
        } else {
          console.error('【支付页面日志】订单存在性校验失败:', res.result.message);
          wx.showToast({
            title: '订单校验失败，请稍后重试',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: (err) => {
        console.error('【支付页面日志】调用订单存在性校验失败:', err);
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  // 新增：启动15分钟自动取消计时
  startAutoCancelTimer: function(orderId) {
    this.clearAutoCancelTimer();
    const TTL = 15 * 60 * 1000;
    autoCancelTimer = setTimeout(() => {
      this.callAutoCancel(orderId);
    }, TTL);
  },

  // 新增：清理计时器
  clearAutoCancelTimer: function() {
    if (autoCancelTimer) {
      clearTimeout(autoCancelTimer);
      autoCancelTimer = null;
    }
  },

  // 新增：调用自动取消云函数
  callAutoCancel: function(orderId) {
    if (!orderId) return;
    wx.cloud.callFunction({
      name: 'autoCancelOrder',
      data: { orderId },
      success: () => {
        wx.showToast({ title: '订单已超时取消', icon: 'none' });
        this.loadOrderInfo(orderId);
      }
    });
  },

  // 返回上一页
  navigateBack: function() {
    wx.navigateBack();
  },

  // 加载订单信息
  loadOrderInfo: function(orderId) {
    wx.cloud.callFunction({
      name: 'order-get',
      data: {
        orderId: orderId
      },
      success: res => {
        if (res.result.code === 200) {
          const order = res.result.data?.order;
          console.log('【支付页面日志】获取到的订单完整信息:', order);
          
          // 【修复点1：增强createTime处理】确保createTime为有效时间
          let createTime = order.createTime;
          if (!createTime || typeof createTime !== 'number') {
            // 如果订单数据中没有createTime或类型不正确，使用当前时间
            createTime = Date.now();
            console.warn('【支付页面日志】订单缺少有效createTime，使用当前时间:', createTime);
          }
          
          // 格式化订单时间
          const formattedTime = orderUtil.formatOrderTime(createTime);
          
          // 【修复点2：获取并设置productId】从订单数据中获取商品ID
          const productId = order.productId || 
                          order.items?.[0]?.productId || 
                          this.data.order?.productId || '';
          
          const quantity = order.quantity || 
                          order.items?.[0]?.quantity || 
                          this.data.order?.quantity || 1;
          
          const orderIdFromRes = order.orderId || order.order_id || order.orderNo || this.data.order?.orderId;
          this.setData({
            order: {
              orderId: orderIdFromRes,
              createTime: formattedTime,
              totalPrice: order.totalPrice,
              productId: productId, // 确保productId存在
              quantity: quantity     // 确保quantity存在
            }
          });

          // 新增：pending 时启动倒计时，其他状态清理
          if (order.status === 'pending') {
            this.startAutoCancelTimer(orderIdFromRes);
          } else {
            this.clearAutoCancelTimer();
          }
          
          console.log('【支付页面日志】更新后的订单信息:', this.data.order);
        } else {
          wx.showToast({
            title: '获取订单信息失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('获取订单信息失败', err);
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      }
    });
  },

  // 加载用户余额
  loadUserBalance: function() {
    // TODO: 从云函数获取用户余额
    // 暂时使用模拟数据
    this.setData({
      balance: 100.00
    });
  },

  // 选择支付方式
  selectPayment: function(e) {
    const payment = e.currentTarget.dataset.payment;
    
    // 如果选择余额支付，弹出提示
    if (payment === 'balance') {
      wx.showModal({
        title: '提示',
        content: '余额支付正在开发中',
        showCancel: false,
        success: (res) => {
          // 提示后，保持微信支付为选中状态
          this.setData({
            selectedPayment: 'wechat'
          });
        }
      });
      return;
    }
    
    this.setData({
      selectedPayment: payment
    });
  },

  // 确认支付
  confirmPayment: function() {
    console.log('=== 确认支付功能触发 ===');
    
    if (this.data.loading) {
      console.log('【支付页面日志2】当前处于加载状态，忽略重复调用');
      return;
    }
    
    // 获取全局app实例
    const app = getApp();
    
    // 【修复点3：前端严格参数校验】
    console.log('【支付页面日志2.1】开始前端参数校验');
    
    const { order } = this.data;
    const paymentType = this.data.selectedPayment;
    
    // 核心参数提取
    const orderId = order.orderId;
    const productId = order.productId || '';
    const quantity = order.quantity || 1;
    const amount = order.totalPrice;
    
    // 打印传递的完整参数
    console.log('【支付页面日志2.2】订单信息:', order);
    console.log('【支付页面日志2.3】选择的支付方式:', paymentType);
    
    // 【修复点4：参数非空校验】
    if (!orderId) {
      wx.showToast({
        title: '订单信息异常，请返回重新下单',
        icon: 'none',
        duration: 2000
      });
      console.error('【支付页面日志2.4】支付页面参数校验失败：缺失orderId');
      return;
    }
    
    if (paymentType !== 'wechat') {
      wx.showToast({
        title: '暂仅支持微信支付',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 支付金额校验
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      wx.showToast({
        title: '支付金额必须大于0',
        icon: 'none',
        duration: 2000
      });
      console.error('【支付页面日志2.5】支付页面参数校验失败：支付金额不合法', amount);
      return;
    }
    
    // 商品ID校验
    if (!productId) {
      wx.showToast({
        title: '商品信息异常，请返回重新下单',
        icon: 'none',
        duration: 2000
      });
      console.error('【支付页面日志2.6】支付页面参数校验失败：缺失productId');
      return;
    }
    
    console.log('【支付页面日志2.7】前端参数校验通过');
    
    // 显示加载状态
    this.setData({
      loading: true
    });
    
    // 【修复点5：调用payOrder云函数传递完整参数】
    wx.cloud.callFunction({
      name: 'pay-create',
      data: {
        orderId: orderId,
        productId: productId,
        quantity: quantity,
        amount: amount,
        description: `硒养山泉商品支付 - ${orderId}`
      },
      success: res => {
        console.log('【支付页面日志5】pay-create云函数返回完整结果:', JSON.stringify(res, null, 2));
        
        if (res.result.code === 200) {
          console.log('【支付页面日志6】pay-create云函数调用成功');
          
          const payData = res.result?.data?.payData;
          
          console.log('【支付页面日志8】获取到的支付参数:', payData);
          
          if (payData && payData.prepay_id) {
            console.log('【支付页面日志9】支付参数完整，准备唤起微信支付组件');
            console.log('【支付页面日志10】prepay_id:', payData.prepay_id);
            
            // 【修复点7：使用微信支付API要求的正确参数格式】
            // 获取前端支付参数，优先使用payment_params，兼容旧格式
            const paymentParams = payData.payment_params || payData;
            
            console.log('【支付页面日志11】处理后的支付参数:', paymentParams);
            
            // 【修复点8：参数合法性校验】
            if (!paymentParams.timeStamp || !paymentParams.nonceStr || !paymentParams.package || !paymentParams.paySign) {
              console.error('【支付页面日志12】支付参数不完整:', {
                timeStamp: !!paymentParams.timeStamp,
                nonceStr: !!paymentParams.nonceStr,
                package: !!paymentParams.package,
                paySign: !!paymentParams.paySign
              });
              this.showPaymentResult(false, '支付参数生成失败，请稍后重试');
              this.setData({
                loading: false
              });
              return;
            }
            
            // 确保参数类型正确
            const finalPaymentParams = {
              timeStamp: String(paymentParams.timeStamp || paymentParams.timestamp),  // 确保是字符串
              nonceStr: String(paymentParams.nonceStr || paymentParams.nonce_str),  // 确保是字符串
              package: String(paymentParams.package || `prepay_id=${payData.prepay_id}`),  // 确保是字符串
              paySign: String(paymentParams.paySign || paymentParams.pay_sign),  // 确保是字符串
              signType: String(paymentParams.signType || 'RSA')  // 确保是字符串
            };
            
            console.log('【支付页面日志13】最终支付参数（类型已转换）:', finalPaymentParams);
            
            // 唤起微信支付组件，完成支付
            wx.requestPayment({
              timeStamp: finalPaymentParams.timeStamp,
              nonceStr: finalPaymentParams.nonceStr,
              package: finalPaymentParams.package,
              paySign: finalPaymentParams.paySign,
              signType: finalPaymentParams.signType,
              success: (payRes) => {
                // 支付成功，更新订单状态
                console.log('【支付页面日志15】唤起微信支付组件成功:', payRes);
                this.clearAutoCancelTimer();
                this.updateOrderStatus(orderId, 'paid', { autoCancelStatus: 'paid' });
                // 显示支付成功结果
                this.showPaymentResult(true, '支付成功');
              },
              fail: (payErr) => {
                // 支付失败
                console.error('【支付页面日志16】唤起微信支付组件失败:', payErr);
                console.error('【支付页面日志17】支付失败原因:', payErr.errMsg);
                
                // 【核心修复：支付失败时更新订单状态】
                let status = 'payment_fail';
                let extra = {};
                if (payErr.errMsg === 'requestPayment:fail cancel') {
                  status = 'cancelled';
                  // 新增：记录取消时间，保持 pending 自动取消
                  const nowTs = Date.now();
                  extra = { cancelPayTime: nowTs, autoCancelStatus: 'pending' };
                  this.startAutoCancelTimer(orderId);
                }
                this.updateOrderStatus(orderId, status, extra);
                
                // 精准错误提示：根据微信支付失败原因给出友好提示
                let failMsg = '支付失败：' + (payErr.errMsg || '未知错误');
                if (payErr.errMsg === 'requestPayment:fail cancel') {
                  failMsg = '支付已取消';
                } else if (payErr.errMsg.includes('fail:auth deny')) {
                  failMsg = '支付授权失败，请重新尝试';
                } else if (payErr.errMsg.includes('fail:system error')) {
                  failMsg = '当前支付通道繁忙，请稍后再试';
                } else if (payErr.errMsg.includes('parameter error')) {
                  failMsg = '支付参数错误，请联系客服';
                } else if (payErr.errMsg.includes('支付验证签名失败')) {
                  failMsg = '支付签名失败，请检查配置后重试';
                } else if (payErr.errMsg.includes('sign')) {
                  failMsg = '支付签名错误，请联系客服';
                }
                
                this.showPaymentResult(false, failMsg);
              },
              complete: () => {
                this.setData({
                  loading: false
                });
                console.log('【支付页面日志18】微信支付组件调用完成');
              }
            });
          } else {
            // 没有获取到支付参数
            console.error('【支付页面日志19】没有获取到有效的支付参数');
            this.showPaymentResult(false, '获取支付参数失败');
            this.setData({
              loading: false
            });
          }
        } else {
          // 支付处理失败
          console.error('【支付页面日志21】payOrder云函数处理失败:', res.result.message);
          
          // 日志辅助排查：打印详细错误信息
          if (res.result.data) {
            console.error('【支付页面日志21.1】payOrder云函数错误详情:', res.result.data);
          }
          
          // 显示友好错误提示
          this.showPaymentResult(false, res.result.message || '支付失败');
          this.setData({
            loading: false
          });
        }
      },
      fail: err => {
        console.error('【支付页面日志22】调用payOrder云函数失败:', err);
        console.error('【支付页面日志23】失败原因:', err.errMsg);
        
        // 优化网络错误提示
        let errorMsg = '网络错误，请稍后重试';
        if (err.errMsg.includes('timeout')) {
          errorMsg = '支付请求超时，请稍后再试';
        } else if (err.errMsg.includes('cloud function execution error')) {
          errorMsg = '支付服务异常，请稍后再试';
        }
        
        this.showPaymentResult(false, errorMsg);
        this.setData({
          loading: false
        });
      }
    });
  },

  // 更新订单状态（新增：支持超时字段）
  updateOrderStatus: function(orderId, status, extra = {}) {
    try {
      wx.cloud.callFunction({
        name: 'order-update-status',
        data: {
          orderId: orderId,
          status: status,
          ...extra
        },
        success: res => {
          console.log('更新订单状态成功', res);
        },
        fail: err => {
          console.error('更新订单状态失败', err);
        }
      });
    } catch (error) {
      console.error('调用更新订单状态云函数失败', error);
    }
  },

  // 显示支付结果
  showPaymentResult: function(result, message) {
    this.setData({
      showResultModal: true,
      paymentResult: result,
      resultMessage: message
    });
  },

  // 处理支付结果操作
  handleResultAction: function() {
    if (this.data.paymentResult) {
      // 支付成功，跳转到订单详情页
      wx.redirectTo({
        url: `/pages/order/detail/detail?orderId=${this.data.order.orderId}`
      });
    } else {
      // 支付失败，关闭弹窗
      this.setData({
        showResultModal: false
      });
    }
  },

  // 返回首页
  goHome: function() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 页面卸载
  onUnload: function() {
    this.clearAutoCancelTimer();
    // 如果支付成功，清除订单缓存
    if (this.data.paymentResult) {
      wx.removeStorageSync('pendingOrderId');
    }
  },

  // 页面隐藏
  onHide: function() {
    this.clearAutoCancelTimer();
  }
});
