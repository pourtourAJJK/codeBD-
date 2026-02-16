// 订单详情页面逻辑
const auth = require('../../utils/auth.js');

Page({
  data: {
    orderId: '',
    order: null,
    loading: true
  },

  onLoad: function (options) {
    // 获取订单ID
    this.setData({
      orderId: options.orderId
    });
    
    // 加载订单详情
    this.loadOrderDetail();
  },

  onShow: function () {
    // 页面显示时刷新订单信息
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
          orderId: this.data.orderId
        }
      });

      if (result.result.code === 200) {
        const order = result.result.data?.order;
        this.setData({
          order: order,
          statusText: this.getStatusText(order?.status)
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
      'cancelled': '已取消'
    };
    return statusMap[status] || '未知状态';
  },

  // 格式化时间
  formatTime: function (timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  },

  // 去支付
  goToPay: function () {
    // 跳转到支付页面
    wx.navigateTo({
      url: '/pages/payment/payment?id=' + this.data.orderId
    });
  },

  // 取消订单
  cancelOrder: async function () {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 调用云函数取消订单
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
              // 刷新订单信息
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
        }
      }
    });
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