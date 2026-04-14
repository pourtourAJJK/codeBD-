// 订单详情页面逻辑（只用 statusmax 管理订单状态）
const auth = require('../../../utils/auth.js');
const timeUtil = require('../../../utils/timeUtil.js');


Page({
  data: {
    orderId: '',
    order: null,
    loading: true,
    showActionBar: false,
    showCancelAction: false,
    showModifyAddress: false,
    pollTimer: null,
    timer: null,
    platform: ''
  },


  onLoad: function (options) {
    // 获取订单ID（兼容多种字段）
    const orderId = options.orderId || options.order_id || options.orderNo || options.out_trade_no || options.id || '';
    this.setData({
      orderId
    });
    
    // 获取设备平台（处理iOS时间兼容）
    const that = this;
    wx.getSystemInfo({
      success: function (res) {
        // 移除未绑定变量的 setData 调用
        // that.setData({
        //   platform: res.platform
        // });
      }
    });
    
    // 加载订单详情
    this.loadOrderDetail();
  },

  // 页面显示时刷新订单信息
  onShow: function () {
    // 直接加载订单详情，不再使用轮询
    this.loadOrderDetail();
  },

  // 页面隐藏
  onHide: function() {
    this.clearCountDownTimer();
  },

  // 关闭页面
  onUnload: function() {
    this.clearCountDownTimer();
  },



  // 查看退款进度
  goRefundDetail: function() {
    if (!this.data.refundInfo) return;
    wx.navigateTo({
      url: `/pages/order/refund-detail/refund-detail?id=${this.data.refundInfo._id}`
    });
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
        const payAmountRaw = Number(
          raw.payAmount || raw.pay_amount || raw.paymentAmount || (totalPrice + shippingFee - discountAmount) || 0
        );
        // 金额单位修正：若 payAmountRaw 大约等于 totalPrice 的 100 倍，则认为 payAmountRaw 是"分"，转换为元
        const payAmount = totalPrice > 0 && payAmountRaw >= totalPrice * 100 - 0.0001
          ? payAmountRaw / 100
          : payAmountRaw;


        // 展示用订单号：不再回退到 Mongo _id
        const orderIdNormalized = raw.order_id || raw.orderId || raw.orderNo || raw.out_trade_no || this.data.orderId;

        // 只用 statusmax 管理订单状态
        const currentStatusmax = raw.statusmax || '1';
        const oldStatusmax = this.data.order?.statusmax || '1';

        const order = {
          ...raw,
          orderId: orderIdNormalized,
          statusmax: currentStatusmax,
          goods,
          createTimeFmt: this.formatTime(raw.createTime || raw.createdAt),
          payTimeFmt: this.formatTime(raw.paymentTime || raw.pay_time || raw.success_time || raw.payTime),
          appointmentTimeFmt: this.getAppointmentTime(raw),
          totalPriceYuan: this.formatPrice(totalPrice),
          shippingFeeYuan: this.formatPrice(shippingFee),
          discountAmountYuan: this.formatPrice(discountAmount),
          payAmountYuan: this.formatPrice(payAmount),
          paymentMethod: raw.paymentMethod || raw.payMethod || '微信支付',
          address: Array.isArray(raw.address) && raw.address.length > 0 ? raw.address[0] : raw.address
        };

        // 状态变化检测：如果状态发生变化，显示提示
        if (oldStatusmax && oldStatusmax !== currentStatusmax) {
          const newStatusText = this.getStatusText(currentStatusmax);
          wx.showToast({
            title: `订单状态更新：${newStatusText}`,
            icon: 'none',
            duration: 2000
          });
        }

        // 根据statusmax判断是否显示操作栏
        // 已取消的订单不显示任何操作按钮
        const isCancelled = currentStatusmax === '6';
        // 待支付状态显示操作栏
        // const showActionBar = currentStatusmax === '1';
        // 除去已取消的订单外，都显示取消订单按钮
        // const showCancelAction = !isCancelled;
        // 除去已取消的订单外，都显示修改地址按钮
        // const showModifyAddress = !isCancelled;

        this.setData({
          order: {
            ...order,
            payAmount
          },
          statusText: this.getStatusText(currentStatusmax)
          // 移除未绑定变量的 setData 调用
          // showActionBar,
          // showCancelAction,
          // showModifyAddress
        });

        // 启动倒计时（仅对待支付订单）
        if (currentStatusmax === '1') {
          this.countDown();
        } else {
          this.clearCountDownTimer();
        }



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

  // 获取订单状态文本（只用 statusmax）
  getStatusText: function (statusmax) {
    const statusMap = {
      '1': '待支付',
      '2': '待接单',
      '3': '待配送',
      '4': '配送中',
      '5': '已完成',
      '6': '已取消',
      '7': '待退款',
      '8': '退款失败',
      '9': '已退款',
      '80': '退货中',
      '90': '已退款'
    };

    return statusMap[statusmax] || '未知状态';
  },





  // 清除倒计时定时器
  clearCountDownTimer() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({
        timer: null
      });
      console.log('详情页倒计时定时器已清除');
    }
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

  // 获取预约时间（优先使用原始字符串，formatTime仅做兜底）
  getAppointmentTime: function (raw) {
    // 1. 优先用存储的原始时间段字符串（最直接，不用转换）
    if (raw.deliveryTimeStr) {
      return raw.deliveryLabel || `${raw.deliveryDateStr} ${raw.deliveryTimeStr}`;
    }
    
    // 2. 兜底：如果没有原始字符串，再用formatTime处理时间戳（兼容旧数据）
    const timeStamp = raw.deliveryTime || raw.appointmentTime;
    if (timeStamp && typeof timeStamp === 'number') {
      return this.formatTime(timeStamp);
    }
    
    // 3. 无数据时的默认值
    return '暂无预约时间';
  },

  // 待支付订单倒计时核心方法（15分钟超时）
  countDown() {
    const that = this;
    const { order } = this.data;
    // 先清除旧定时器，避免重复创建
    this.clearCountDownTimer();

    // 启动新的定时器（每秒执行一次）
    const timer = setInterval(() => {
      let newOrder = { ...order };
      
      // 订单创建时间：兼容云开发的serverDate（时间戳/字符串）
      let createdTime = newOrder.createTime || newOrder.createdAt;
      if (createdTime && createdTime._seconds) { // 云开发serverDate的时间戳格式
        createdTime = new Date(createdTime._seconds * 1000);
      }
      // 15分钟超时：计算支付截止时间（创建时间+15分钟）
      const payDeadline = new Date(new Date(createdTime).getTime() + 15 * 60 * 1000);
      const nowTime = new Date(); // 当前时间
      // 计算时间差（毫秒数）
      const timeDiff = timeUtil.compareDate(payDeadline, nowTime);

      if (timeDiff > 0) {
        // 未超时：格式化剩余时间，赋值给countdown字段
        newOrder.countdown = timeUtil.formatMsToMinSec(timeDiff);
      } else {
        // 已超时：删除倒计时字段
        delete newOrder.countdown;
        that.cancelOrderAuto(newOrder.orderId || newOrder._id); // 调用自动取消订单方法
        // 超时后把订单状态置为已取消（前端临时更新，云函数会同步）
        newOrder.statusmax = '6';
        newOrder.statusText = '已取消';
        that.clearCountDownTimer();
      }

      // 更新订单信息，页面自动刷新倒计时
      that.setData({
        order: newOrder,
        timer: timer
      });
    }, 1000); // 每秒刷新一次
  },

  // 超时自动取消订单（调用order-cancel云函数）
  cancelOrderAuto(orderId) {
    if (!orderId) return;
    wx.cloud.callFunction({
      name: 'order-cancel', // 取消订单云函数
      data: {
        orderId: orderId // 传递订单ID
      }
    }).then(res => {
      if (res.result.code === 200) {
        console.log('订单超时自动取消成功：', orderId);
      } else {
        console.error('订单超时取消失败：', res.result.message);
      }
    }).catch(err => {
      console.error('调用取消订单云函数失败：', err);
    });
  },



  // 去支付
  goToPay: function () {
    // 跳转到支付页面（保持兼容，若有新支付页可替换）
    wx.navigateTo({
      url: `/pages/pay/pay?orderId=${this.data.orderId}`
    });
  },


  // 底部操作：取消订单跳转到退款申请页面
  onCancelAction: function () {
    if (!this.data.order) {
      wx.showToast({ title: '订单信息缺失', icon: 'none' });
      return;
    }
    
    // 跳转到退款申请页面
    wx.navigateTo({
      url: '/pages/order/refund/refund?orderId=' + this.data.orderId
    });
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
          statusmax: this.data.order?.statusmax || '1',
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


  // 关键修复点2：添加退款功能，调用wxpayFunctions（只用 statusmax）
  applyRefund: async function () {
    if (!this.data.order) {
      wx.showToast({
        title: '订单信息不存在',
        icon: 'none'
      });
      return;
    }

    // 订单状态校验 - 只用 statusmax
    const statusmax = this.data.order.statusmax;
    // 仅待支付、待接单、待配送可退款，配送中/已完成不允许退款，同时兼容退款状态
    if (statusmax !== '1' && statusmax !== '2' && statusmax !== '3' && statusmax !== '7' && statusmax !== '8' && statusmax !== '9') {
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
