// 订单详情页面逻辑
const auth = require('../../../utils/auth.js');


Page({
  data: {
    orderId: '',
    order: null,
    loading: true,
    showActionBar: false
  },


  onLoad: function (options) {
    // 获取订单ID（兼容多种字段）
    const orderId = options.orderId || options.order_id || options.orderNo || options.out_trade_no || options.id || '';
    this.setData({
      orderId
    });
    
    // 加载订单详情
    this.loadOrderDetail();
  },


  onShow: function () {
    // 页面显示时刷新订单信息
    const statusMap = wx.getStorageSync('refundStatusMap') || {};
    const pendingStatus = statusMap[this.data.orderId];
    if (pendingStatus === 'refunding') {
      this.setData({
        order: { ...(this.data.order || {}), status: 'refunding' },
        statusText: '退款中'
      });
    } else if (pendingStatus === 'refunded') {
      this.setData({
        order: { ...(this.data.order || {}), status: 'refunded' },
        statusText: '已退款'
      });
    }
    this.loadOrderDetail();
  },


  // 加载订单详情
  loadOrderDetail: async function () {
    if (!this.data.orderId) {
      wx.showToast({
        title: '订单ID错误',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      // 检查用户登录状态
      const isLoggedIn = auth.isLoggedIn();
      if (!isLoggedIn) {
        return;
      }

      // 调用云函数获取订单详情
      const result = await wx.cloud.callFunction({
        name: 'order-get',
        data: {
          orderId: this.data.orderId,
          order_id: this.data.orderId,
          orderNo: this.data.orderId,
          out_trade_no: this.data.orderId
        }
      });


      if (result.result.code === 200) {
        const raw = result.result.data?.order || {};
        const goods = (raw.goods || []).map((g) => ({
          ...g,
          price: Number(g.price || g.sale_price || g.pay_price || 0),
          priceYuan: this.formatPrice(g.price || g.sale_price || g.pay_price || 0)
        }));
        const totalPrice = Number(raw.totalPrice || raw.total_amount || raw.totalAmount || 0);
        const shippingFee = Number(raw.shippingFee || raw.freight || 0);
        const discountAmount = Number(raw.discountAmount || raw.discount || 0);
        const payAmount = Number(
          raw.payAmount || raw.pay_amount || raw.paymentAmount || (totalPrice + shippingFee - discountAmount) || 0
        );

        // 展示用订单号：不再回退到 Mongo _id
        const orderIdNormalized = raw.order_id || raw.orderId || raw.orderNo || raw.out_trade_no || this.data.orderId;

        const order = {
          ...raw,
          orderId: orderIdNormalized,
          goods,
          createTimeFmt: this.formatTime(raw.createTime || raw.createdAt),
          payTimeFmt: this.formatTime(raw.paymentTime || raw.pay_time || raw.success_time || raw.payTime),
          totalPriceYuan: this.formatPrice(totalPrice),
          shippingFeeYuan: this.formatPrice(shippingFee),
          discountAmountYuan: this.formatPrice(discountAmount),
          payAmountYuan: this.formatPrice(payAmount),
          paymentMethod: raw.paymentMethod || raw.payMethod || '微信支付'
        };

        // 覆盖本地退款状态（支持多种订单号键）
        const statusMap = wx.getStorageSync('refundStatusMap') || {};
        const possibleKeys = [orderIdNormalized, raw._id, raw.order_no, raw.orderNo, raw.out_trade_no].filter(Boolean);
        const matchedKey = possibleKeys.find(k => statusMap[k]);
        const pendingStatus = matchedKey ? statusMap[matchedKey] : undefined;
        if (pendingStatus === 'refunding' || pendingStatus === 'refunded') {
          order.status = pendingStatus;
        }
        // 读取后端真实状态，若已退款/已完成/已取消则回写 storage，避免假“退款中”悬挂
        if (['refunded', 'cancelled', 'completed'].includes(order.status)) {
          if (matchedKey && statusMap[matchedKey] !== order.status) {
            statusMap[matchedKey] = order.status;
            wx.setStorageSync('refundStatusMap', statusMap);
          }
        }

        const showActionBar = ['paid', 'pending'].includes(order?.status);



        this.setData({
          order,
          statusText: this.getStatusText(order?.status),
          showActionBar
        });


      } else {

        wx.showToast({
          title: result.result.message || '获取订单失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('获取订单详情失败', error);
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 获取订单状态文本
  getStatusText: function (status) {
    const statusMap = {
      'pending': '待付款',
      'paid': '待发货',
      'shipped': '待收货',
      'delivered': '已完成',
      'completed': '已完成',
      'cancelled': '已取消',
      'refunding': '退款中',
      'refunded': '已退款'
    };

    return statusMap[status] || '未知状态';
  },

  // 格式化时间
  formatTime: function (timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const pad = (n) => (n < 10 ? '0' + n : n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  },

  // 格式化价格（智能识别分/元，两位小数）
  formatPrice: function (amount) {
    const n = Number(amount || 0);
    // 约定：大于等于1000视为分，否则视为元
    if (n >= 1000) return (n / 100).toFixed(2);
    return n.toFixed(2);
  },



  // 去支付
  goToPay: function () {
    // 跳转到支付页面（保持兼容，若有新支付页可替换）
    wx.navigateTo({
      url: `/pages/pay/pay?orderId=${this.data.orderId}`
    });
  },


  // 底部操作：根据状态处理取消
  onCancelAction: function () {
    if (!this.data.order) {
      wx.showToast({ title: '订单信息缺失', icon: 'none' });
      return;
    }
    const status = this.data.order.status;
    if (status === 'paid') {
      wx.navigateTo({ url: `/pages/order/refund/refund?orderId=${this.data.orderId}` });
      return;
    }
    if (status === 'pending') {
      wx.showModal({
        title: '提示',
        content: '是否取消订单',
        cancelText: '否',
        confirmText: '是',
        success: (res) => {
          if (res.confirm) {
            this.performCancelOrder();
          }
        }
      });
      return;
    }
    wx.showToast({ title: '当前状态不可取消', icon: 'none' });
  },

  // 取消订单（实际执行）
  performCancelOrder: async function () {
    try {
      const result = await wx.cloud.callFunction({
        name: 'order-cancel',
        data: {
          orderId: this.data.orderId
        }
      });

      if (result.result.code === 200) {
        wx.showToast({
          title: '订单已取消',
          icon: 'success'
        });
        this.loadOrderDetail();
      } else {
        wx.showToast({
          title: result.result.message || '取消失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('取消订单失败', error);
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      });
    }
  },


  // 确认收货
  confirmReceipt: async function () {
    wx.showModal({
      title: '确认收货',
      content: '请确认您已收到商品，再进行确认收货操作',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 调用云函数确认收货
            const result = await wx.cloud.callFunction({
              name: 'order-confirm-receipt',
              data: {
                orderId: this.data.orderId
              }
            });

            if (result.result.code === 200) {
              wx.showToast({
                title: '确认收货成功',
                icon: 'success'
              });
              // 刷新订单信息
              this.loadOrderDetail();
            } else {
              wx.showToast({
                title: result.result.message || '确认失败',
                icon: 'none'
              });
            }
          } catch (error) {
            console.error('确认收货失败', error);
            wx.showToast({
              title: '网络错误，请稍后重试',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 查看订单
  viewOrder: function () {
    // 刷新订单信息
    this.loadOrderDetail();
  },

  // 关键修复点1：添加订单查询功能，调用wxpayFunctions
  queryWxOrder: async function () {
    console.log('========================================');
    console.log('【订单查询日志1】订单查询功能触发');
    console.log('【订单查询日志2】当前订单状态:', this.data.order);
    
    if (!this.data.order) {
      console.error('【订单查询日志3】订单信息不存在，无法查询');
      wx.showToast({
        title: '订单信息不存在',
        icon: 'none'
      });
      return;
    }

    console.log('【订单查询日志4】开始查询微信订单，订单号:', this.data.order.orderId);

    wx.showLoading({
      title: '查询订单中...',
      mask: true
    });

    try {
      console.log('【订单查询日志5】准备调用wxpayFunctions云函数');
      // 调用wxpayFunctions云函数查询微信订单
      const result = await wx.cloud.callFunction({
        name: 'wxpayFunctions',
        data: {
          type: 'query_order',
          out_trade_no: this.data.order.out_trade_no || this.data.order.outTradeNo || this.data.order.orderId
        }
      });

      wx.hideLoading();
      
      console.log('【订单查询日志6】查询微信订单结果:', result);
      console.log('【订单查询日志6.1】云函数返回状态:', result.result.code);
      console.log('【订单查询日志6.2】云函数返回消息:', result.result.message);
      console.log('【订单查询日志6.3】云函数返回数据:', result.result.data);
      
      if (result.result.code === 200) {
        console.log('【订单查询日志7】订单查询成功');
        wx.showModal({
          title: '订单查询结果',
          content: JSON.stringify(result.result.data, null, 2),
          showCancel: false,
          confirmText: '知道了'
        });
      } else {
        console.error('【订单查询日志8】订单查询失败:', result.result.message || '未知错误');
        wx.showToast({
          title: `查询失败：${result.result.message || '未知错误'}`,
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('【订单查询日志9】查询微信订单异常失败:', error);
      console.error('【订单查询日志9.1】错误类型:', error.name);
      console.error('【订单查询日志9.2】错误消息:', error.message);
      console.error('【订单查询日志9.3】错误堆栈:', error.stack);
      wx.showToast({
        title: '查询失败，请稍后重试',
        icon: 'none'
      });
    } finally {
      console.log('【订单查询日志10】订单查询流程完成');
      console.log('========================================');
    }
  },

  // 修改时间（占位：可接入实际改约接口）
  modifyTime: function () {
    wx.showToast({
      title: '请联系客服修改送达时间',
      icon: 'none'
    });
  },

  // 修改地址：选择新地址并更新订单地址
  modifyAddress: function () {
    if (!this.data.order) {
      wx.showToast({ title: '订单信息缺失', icon: 'none' });
      return;
    }

    const that = this;
    wx.navigateTo({
      url: '/pages/address/address?selectMode=true&from=orderDetail',
      events: {
        selectedAddress: function (data) {
          if (data && data.address) {
            that.updateOrderAddress(data.address);
          }
        }
      }
    });
  },

  // 更新订单地址到数据库
  updateOrderAddress: async function (address) {
    try {
      wx.showLoading({ title: '更新中...', mask: true });
      const result = await wx.cloud.callFunction({
        name: 'order-update-status',
        data: {
          orderId: this.data.orderId,
          status: this.data.order?.status || 'paid',
          address
        }
      });
      wx.hideLoading();

      if (result.result.code === 200) {
        wx.showToast({ title: '地址已更新', icon: 'success' });
        const newOrder = { ...this.data.order, address };
        this.setData({ order: newOrder });
      } else {
        wx.showToast({ title: result.result.message || '更新失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('更新订单地址失败', err);
      wx.showToast({ title: '更新失败，请稍后重试', icon: 'none' });
    }
  },


  // 关键修复点2：添加退款功能，调用wxpayFunctions
  applyRefund: async function () {
    if (!this.data.order) {
      wx.showToast({
        title: '订单信息不存在',
        icon: 'none'
      });
      return;
    }

    // 订单状态校验
    if (this.data.order.status !== 'paid' && this.data.order.status !== 'shipped') {
      wx.showToast({
        title: '当前订单状态不允许退款',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '申请退款',
      content: `确定要申请退款吗？退款金额：¥${this.data.order.totalPrice.toFixed(2)}`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '申请退款中...',
            mask: true
          });

          try {
            // 调用wxpayFunctions云函数申请退款
            const result = await wx.cloud.callFunction({
              name: 'wxpayFunctions',
              data: {
                type: 'wxpay_refund',
                transaction_id: this.data.order.transaction_id || this.data.order.transactionId,
                out_refund_no: `refund_${this.data.order.orderId}_${Date.now()}`,
                amount: {
                  refund: Math.round(this.data.order.totalPrice * 100),
                  total: Math.round(this.data.order.totalPrice * 100),
                  currency: 'CNY'
                }
              }
            });

            wx.hideLoading();
            
            console.log('申请退款结果:', result);
            
            if (result.result.code === 200) {
              wx.showToast({
                title: '退款申请成功',
                icon: 'success'
              });
              // 刷新订单信息
              this.loadOrderDetail();
            } else {
              wx.showToast({
                title: `退款失败：${result.result.message || '未知错误'}`,
                icon: 'none'
              });
            }
          } catch (error) {
            wx.hideLoading();
            console.error('申请退款失败:', error);
            wx.showToast({
              title: '退款失败，请稍后重试',
              icon: 'none'
            });
          }
        }
      }
    });
  }
});