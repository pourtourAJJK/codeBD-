// 订单列表页逻辑
const app = getApp();
const auth = require('../../utils/auth');
const orderUtil = require('../../utils/orderUtil');

// 新增：自动取消计时器句柄
let autoCancelTimer = null;

Page({

  data: {
    // 订单列表（确保初始化为空数组）
    orders: [],
    // 当前选中的标签页
    activeTab: 'all',
    // 加载状态
    loading: false,
    // 错误提示
    errorMsg: ''
  },

  // 页面加载
  onLoad: function(options) {
    // 检查用户登录状态，未登录则阻止后续逻辑
    if (!this.checkLoginStatus()) {
      return;
    }
    
    // 如果有传入的tab参数或type参数，切换到对应标签页（增加参数校验）
    if (options?.tab && typeof options.tab === 'string') {
      this.setData({
        activeTab: options.tab
      });
    } else if (options?.type && typeof options.type === 'string') {
      this.setData({
        activeTab: options.type
      });
    }
  },

  // 页面显示
  onShow: function() {
    // 加载订单列表
    this.loadOrders();
  },

  // 检查登录状态
  checkLoginStatus: function() {
    if (!auth.isLoggedIn()) {
      // 未登录，跳转到登录页
      wx.navigateTo({
        url: '/pages/auth/login/login'
      });
      return false;
    }
    return true;
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
        this.loadOrders();
      }
    });
  },

  // 返回上一页

  navigateBack: function() {
    wx.navigateBack();
  },

  // 切换标签页
  switchTab: function(e) {
    const tab = e.currentTarget?.dataset?.tab;
    if (tab && typeof tab === 'string' && tab !== this.data.activeTab) {
      this.setData({
        activeTab: tab
      });
      // 重新加载订单
      this.loadOrders();
    }
  },

  // 加载订单列表
  loadOrders: function(callback) {
    console.log('========================================');
    console.log('【订单列表日志0】开始加载订单列表');
    console.log('【订单列表日志0.1】当前选中标签:', this.data.activeTab);
    
    if (!this.checkLoginStatus()) {
      console.log('【订单列表日志0.2】登录状态检查失败');
      console.log('========================================');
      return;
    }
    

    // 核心修复：在开始加载前，彻底重置所有状态
    this.setData({
      loading: true,
      errorMsg: '', // 清空错误提示
      orders: [] // 清空旧订单数据
    });
    
    console.log('【订单列表日志0.5】加载状态设置完成');

    // 构建查询参数
    const params = {};
    console.log('【订单列表日志0.6】基础查询参数:', params);
    
    // 如果不是全部订单，添加状态筛选（校验状态合法性）
    const validStatus = ['all', 'pending', 'paid', 'shipped', 'completed', 'cancelled'];
    if (this.data.activeTab !== 'all' && validStatus.includes(this.data.activeTab)) {
      params.status = this.data.activeTab;
      console.log('【订单列表日志0.7】添加状态筛选:', this.data.activeTab);
    }
    console.log('【订单列表日志0.8】最终查询参数:', params);
    
    // 调用获取订单列表云函数
    console.log('【订单列表日志0.9】准备调用getOrders云函数');

    wx.cloud.callFunction({
      name: 'order-list',
      data: params,
      success: res => {
        console.log('========================================');
        console.log('【订单列表日志1】获取订单列表成功回调触发');
        console.log('【订单列表日志2】云函数返回结果:', res);
        console.log('【订单列表日志3】返回code:', res?.result?.code);
        
        if (res?.result?.code === 200) {
          const rawOrders = Array.isArray(res.result.data?.orders) ? res.result.data.orders : [];
          console.log('【订单列表日志4】原始订单数据:', rawOrders);
          const formattedOrders = this.formatOrders(rawOrders);
          console.log('【订单列表日志5】格式化后的订单数据:', formattedOrders);
          
          // 终极修复：强制清空错误信息，确保万无一失
          this.setData({
            orders: formattedOrders,
            errorMsg: '' // 再次强制清空错误提示
          }, () => {
            console.log('【订单列表日志6】订单数据加载成功，共', formattedOrders.length, '条订单');
            console.log('【订单列表日志7】当前errorMsg状态:', this.data.errorMsg); // 打印确认
            console.log('========================================');
            // 如果有回调函数，执行回调（如下拉刷新）
            if (typeof callback === 'function') {
              callback();
            }
          });
        } else {
          // 获取订单失败
          console.error('【订单列表日志7】获取订单失败:', res?.result?.message || '未知错误');
          this.setData({
            errorMsg: '获取订单失败：' + (res?.result?.message || '未知错误')
          });
          console.log('========================================');
        }
      },
      fail: err => {
        console.error('========================================');
        console.error('【订单列表日志8】获取订单列表失败回调触发');
        console.error('【订单列表日志9】错误信息:', err);
        this.setData({
          errorMsg: '网络错误，请稍后重试'
        });
        console.error('========================================');
      },
      complete: () => {
        this.setData({
          loading: false
        });
      }
    });
  },

  // 金额格式化函数
  formatPrice: function(price) {
    // 容错处理：确保price是数字
    const numPrice = typeof price === 'number' ? price : parseFloat(price) || 0;
    // 格式化为¥XX.XX格式
    return '¥' + numPrice.toFixed(2);
  },

  // 格式化订单数据
  formatOrders: function(orders) {
    // 确保输入是数组
    if (!Array.isArray(orders)) {
      console.error('【formatOrders】输入不是数组:', orders);
      return [];
    }
    
    return orders.map(order => {
      try {
        // 统一订单ID，避免前端找不到 orderId
        const orderId = order.orderId || order.order_id || order.orderNo || order.out_trade_no || order._id || '';

        // 统一商品列表字段：优先 items，没有则兜底 goods
        const itemsRaw = Array.isArray(order.items)
          ? order.items
          : (Array.isArray(order.goods) ? order.goods : []);

        // 规范化商品字段，避免 productId / product_id 不一致
        const items = itemsRaw.map(product => {
          const productId = product.productId || product.product_id || product.spuId || product.id || '';
          const productName = product.productName || product.product_name || product.name || '商品';
          const price = Number(product.price || product.sale_price || 0) || 0;
          const quantity = Number(product.quantity || product.count || 1) || 1;
          const cover = product.cover_image || product.coverImage || product.image || '';
          return {
            ...product,
            productId,
            productName,
            price,
            quantity,
            cover_image: cover
          };
        });
        
        // 计算商品总数
        const productCount = items.reduce((total, product) => {
          const quantity = Number(product.quantity) || 0;
          return total + quantity;
        }, 0);
        
        // 格式化创建时间（容错处理）
        const rawCreateTime = order.createTime || order.createdAt || order.create_time || order.create_at || '';
        const createTime = rawCreateTime ? orderUtil.formatOrderTime(rawCreateTime) : '';
        
        // 获取订单状态文本和颜色（确保status存在）
        const status = order.status || order.order_status || '';
        const statusText = orderUtil.getOrderStatusText(status);
        const statusColor = orderUtil.getOrderStatusColor(status);
        
        // 确保金额字段存在且为数字
        const totalPrice = Number(order.totalPrice || order.total_amount || order.totalAmount || 0) || 0;
        const deliveryFee = Number(order.deliveryFee || order.shippingFee || order.freight || 0) || 0;
        
        return {
          ...order,
          orderId,
          items,
          productCount,
          createTime,
          statusText,
          statusColor,
          totalPrice,
          deliveryFee,
          // 添加金额格式化方法到订单对象
          formatPrice: (price) => {
            return this.formatPrice(price);
          }
        };
      } catch (e) {
        console.error('【formatOrders】格式化订单失败:', e, order);
        return {
          ...order,
          items: [],
          productCount: 0,
          createTime: '',
          statusText: '未知状态',
          statusColor: '#999',
          totalPrice: 0,
          deliveryFee: 0
        };
      }
    });
  },


  // 去购物
  goShopping: function() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 查看商品详情
  viewProductDetail: function(e) {
    const productId = e.currentTarget?.dataset?.productId;
    if (productId) {
      wx.navigateTo({
        url: `/pages/product/detail/detail?id=${productId}`
      });
    } else {
      this.showError('商品信息获取失败');
    }
  },

  // 支付订单
  payOrder: function(e) {
    // 尽量从多个字段兜底获取 orderId，避免提示“订单信息获取失败”
    // 注意：WXML 使用 data-order-id，dataset 中键为 orderId（驼峰）
    let orderId = e.currentTarget?.dataset?.orderId
      || e.currentTarget?.dataset?.order_id
      || e.currentTarget?.dataset?.orderid
      || '';

    // 从列表缓存中再兜底一次
    if (!orderId) {
      const orderIndex = e.currentTarget?.dataset?.index;
      if (typeof orderIndex === 'number' && this.data.orders[orderIndex]) {
        const item = this.data.orders[orderIndex];
        orderId = item.orderId || item.order_id || item.orderNo || item.out_trade_no || item._id || '';
      }
    }

    if (!orderId) {
      this.showError('订单信息获取失败');
      return;
    }
    
    const order = this.data.orders.find(order => {
      const id = order.orderId || order.order_id || order.orderNo || order.out_trade_no || order._id;
      return id === orderId;
    });
    if (order) {
      // 新增：启动本地倒计时，防未支付超时
      this.startAutoCancelTimer(orderId);
      wx.navigateTo({
        url: `/pages/pay/pay?orderId=${orderId}&totalPrice=${order.totalPrice || order.total_amount || 0}`
      });
    } else {
      this.showError('未找到该订单');
    }
  },




  // 取消订单
  cancelOrder: function(e) {
    const orderId = e.currentTarget?.dataset?.orderId;
    if (!orderId) {
      this.showError('订单信息获取失败');
      return;
    }
    
    wx.showModal({
      title: '确认取消',
      content: '确定要取消该订单吗？',
      success: res => {
        if (res.confirm) {
          this.doCancelOrder(orderId);
        }
      }
    });
  },

  // 执行取消订单操作
  doCancelOrder: function(orderId) {
    if (!orderId) {
      this.showError('订单信息错误');
      return;
    }
    
    this.setData({
      loading: true
    });
    
    wx.cloud.callFunction({
      name: 'order-cancel',
      data: {
        orderId: orderId
      },
      success: res => {
        if (res?.result?.code === 200) {
          wx.showToast({
            title: '订单已取消',
            icon: 'success'
          });
          this.loadOrders();
        } else {
          this.showError('取消订单失败：' + (res?.result?.message || '未知错误'));
        }
      },
      fail: err => {
        console.error('取消订单失败', err);
        this.showError('网络错误，请稍后重试');
      },
      complete: () => {
        this.setData({
          loading: false
        });
      }
    });
  },

  // 提醒发货
  remindShip: function(e) {
    const orderId = e.currentTarget?.dataset?.orderId;
    if (!orderId) {
      this.showError('订单信息获取失败');
      return;
    }
    
    wx.showToast({
      title: '已提醒发货',
      icon: 'success'
    });
  },

  // 确认收货
  confirmReceipt: function(e) {
    const orderId = e.currentTarget?.dataset?.orderId;
    if (!orderId) {
      this.showError('订单信息获取失败');
      return;
    }
    
    wx.showModal({
      title: '确认收货',
      content: '请确认您已经收到商品',
      success: res => {
        if (res.confirm) {
          this.doConfirmReceipt(orderId);
        }
      }
    });
  },

  // 执行确认收货操作
  doConfirmReceipt: function(orderId) {
    if (!orderId) {
      this.showError('订单信息错误');
      return;
    }
    
    this.setData({
      loading: true
    });
    
    wx.cloud.callFunction({
      name: 'order-confirm-receipt',
      data: {
        orderId: orderId
      },
      success: res => {
        if (res?.result?.code === 200) {
          wx.showToast({
            title: '确认收货成功',
            icon: 'success'
          });
          this.loadOrders();
        } else {
          this.showError('确认收货失败：' + (res?.result?.message || '未知错误'));
        }
      },
      fail: err => {
        console.error('确认收货失败', err);
        this.showError('网络错误，请稍后重试');
      },
      complete: () => {
        this.setData({
          loading: false
        });
      }
    });
  },

  // 查看物流
  checkLogistics: function(e) {
    const orderId = e.currentTarget?.dataset?.orderId;
    if (orderId) {
      wx.navigateTo({
        url: `/pages/order/logistics/logistics?orderId=${orderId}`
      });
    } else {
      this.showError('订单信息获取失败');
    }
  },

  // 管理订单
  manageOrder: function(e) {
    const orderId = e.currentTarget?.dataset?.orderId;
    if (!orderId) {
      this.showError('订单信息获取失败');
      return;
    }
    
    wx.showModal({
      title: '是否删除订单',
      content: '确定要删除该订单吗？',
      confirmText: '确定',
      cancelText: '取消',
      success: res => {
        if (res.confirm) {
          // 前端删除订单（不操作数据库）
          const updatedOrders = this.data.orders.filter(order => order.orderId !== orderId);
          this.setData({
            orders: updatedOrders
          });
          wx.showToast({
            title: '订单已删除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 删除订单
  deleteOrder: function(e) {
    const orderId = e.currentTarget?.dataset?.orderId;
    if (!orderId) {
      this.showError('订单信息获取失败');
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该订单吗？删除后不可恢复',
      success: res => {
        if (res.confirm) {
          this.doDeleteOrder(orderId);
        }
      }
    });
  },

  // 执行删除订单操作
  doDeleteOrder: function(orderId) {
    if (!orderId) {
      this.showError('订单信息错误');
      return;
    }
    
    this.setData({
      loading: true
    });
    
    wx.cloud.callFunction({
      name: 'order-cancel',
      data: {
        orderId: orderId
      },
      success: res => {
        if (res?.result?.code === 200) {
          wx.showToast({
            title: '订单已取消',
            icon: 'success'
          });
          this.loadOrders();
        } else {
          this.showError('取消订单失败：' + (res?.result?.message || '未知错误'));
        }
      },
      fail: err => {
        console.error('删除订单失败', err);
        this.showError('网络错误，请稍后重试');
      },
      complete: () => {
        this.setData({
          loading: false
        });
      }
    });
  },

  // 查看订单详情
  viewOrderDetail: function(e) {
    const orderId = e.currentTarget?.dataset?.orderId;
    if (orderId) {
      wx.navigateTo({
        url: `/pages/order/detail/detail?orderId=${orderId}`
      });
    } else {
      this.showError('订单信息获取失败');
    }
  },

  // 显示错误提示
  showError: function(msg) {
    // 只有在加载失败时才显示错误提示
    if (this.data.loading) {
      console.warn('【警告】正在加载中，忽略错误提示:', msg);
      return;
    }
    
    if (typeof msg !== 'string' || !msg) {
      msg = '操作失败，请重试';
    }
    this.setData({
      errorMsg: msg
    });
    
    // 3秒后隐藏错误提示
    setTimeout(() => {
      this.setData({
        errorMsg: ''
      });
    }, 3000);
  },

  // 页面下拉刷新
  onPullDownRefresh: function() {
    // 重新加载订单列表，在加载完成后停止刷新
    this.loadOrders(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 页面上拉触底
  onReachBottom: function() {
    // TODO: 实现分页加载
  },

  // 页面隐藏/卸载时清理计时器
  onHide: function() {
    this.clearAutoCancelTimer();
  },
  onUnload: function() {
    this.clearAutoCancelTimer();
  }
});
