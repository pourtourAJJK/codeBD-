// 订单列表页逻辑
const app = getApp();
const auth = require('../../utils/auth');
const orderUtil = require('../../utils/orderUtil');
const timeUtil = require('../../utils/timeUtil.js');

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
    // 防重复加载标志
    isLoading: false,
    // 错误提示
    errorMsg: '',
    // 倒计时定时器
    timer: null,
    // 设备平台
    platform: '',
    // 页面参数
    pageOptions: {},
    // 分页参数
    currentPage: 1,
    pageSize: 10,
    hasMore: true
  },

  // 页面加载
  onLoad: function(options) {
    // 检查用户登录状态，未登录则阻止后续逻辑
    if (!this.checkLoginStatus()) {
      return;
    }
    
    // 存储页面参数
    this.setData({
      pageOptions: options || {}
    });
    
    // 获取设备平台（处理iOS时间兼容）
    const that = this;
    wx.getSystemInfo({
      success: function (res) {
        that.setData({
          platform: res.platform
        });
      }
    });
    
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
    console.log('【订单列表】页面显示');

    // 修复：从其他页面跳转过来时，确保正确显示对应标签
    const { pageOptions } = this.data;

    // 修复：将 loadOrders 放到 setData 回调中，确保 activeTab 已更新后再加载订单
    if (pageOptions?.type && typeof pageOptions.type === 'string') {
      this.setData({
        activeTab: pageOptions.type
      }, () => {
        console.log('【订单列表】页面显示，执行 loadOrders (type)');
        this.loadOrders();
      });
    } else if (pageOptions?.tab && typeof pageOptions.tab === 'string') {
      this.setData({
        activeTab: pageOptions.tab
      }, () => {
        console.log('【订单列表】页面显示，执行 loadOrders (tab)');
        this.loadOrders();
      });
    } else {
      console.log('【订单列表】页面显示，执行 loadOrders (default)');
      this.loadOrders();
    }

    // 清理旧倒计时（防止干扰）
    this.clearCountDownTimer();
  },

  onHide: function() {
    this.clearAutoCancelTimer();
    this.clearChunkTimer();
    this.clearCountDownTimer();
  },

  onUnload: function() {
    this.clearAutoCancelTimer();
    this.clearChunkTimer();
    this.clearCountDownTimer();
  },

  // 封装：清除倒计时定时器
  clearCountDownTimer() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({
        timer: null
      });
      console.log('倒计时定时器已清除');
    }
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
    console.log("切换标签到：", tab); // 加日志验证
    // 防重复+防无效点击
    if (this.data.isLoading || tab === this.data.activeTab) return;

    this.setData({
      activeTab: tab,
      orders: [], // 清空旧数据
      currentPage: 1, // 重置分页（避免分页错乱）
      hasMore: true, // 重置是否有更多数据
      isLoading: true // 上锁
    }, () => {
      // 确保 activeTab 已经更新后，再执行加载
      this.loadOrders();
    });
  },



  // 渲染分片定时器
  clearChunkTimer: function() {
    if (this.chunkTimer) {
      clearTimeout(this.chunkTimer);
      this.chunkTimer = null;
    }
  },

  renderOrdersInChunks: function(list) {
    this.clearChunkTimer();
    const chunkSize = 20;
    let index = 0;
    const render = () => {
      const next = list.slice(0, (index + 1) * chunkSize);
      this.setData({ orders: next });
      index++;
      if (next.length < list.length) {
        this.chunkTimer = setTimeout(render, 0);
      }
    };
    render();
  },

  // 加载订单列表
  loadOrders: function(callback, isLoadMore = false) {


    console.log('========================================');
    console.log('【订单列表日志0】开始加载订单列表');
    console.log('【订单列表日志0.1】当前选中标签:', this.data.activeTab);
    console.log('【订单列表日志0.1.1】是否加载更多:', isLoadMore);
    console.log('【订单列表日志0.1.2】当前页码:', this.data.currentPage);
    
    if (!this.checkLoginStatus()) {
      console.log('【订单列表日志0.2】登录状态检查失败');
      console.log('========================================');
      return;
    }
    
    // 如果没有更多数据，停止加载
    if (isLoadMore && !this.data.hasMore) {
      console.log('【订单列表日志0.3】没有更多数据，停止加载');
      console.log('========================================');
      if (typeof callback === 'function') {
        callback();
      }
      return;
    }

    // 核心修复：在开始加载前，仅设置 loading / errorMsg，避免大列表二次清空闪屏
    this.setData({
      loading: !isLoadMore, // 加载更多时不显示全屏加载
      errorMsg: '' // 清空错误提示
    });
    
    console.log('【订单列表日志0.5】加载状态设置完成');


    // 构建查询参数
    const params = {
      page: this.data.currentPage,
      pageSize: this.data.pageSize
    };
    console.log('【订单列表日志0.6】基础查询参数:', params);
    
    // 标签到查询条件的映射（适配字符串类型 statusmax/pay_status）
    const tabQueryMap = {
      all: { $or: [{ pay_status: "1" }, { statusmax: "6" }] }, // 全部已支付和已取消订单
      unpaid: { statusmax: "1" }, // 待支付：statusmax = "1"
      pending_delivery: {
        pay_status: "1", // 已支付
        statusmax: { $in: ["2", "3"] } // 待接单(2) 或 待配送(3)
      },
      delivering: { statusmax: "4" }, // 配送中
      completed: { statusmax: "5" }, // 已完成
      after_sales: { statusmax: { $in: ["7", "9"] } } // 售后：退款中(7) 或 退款成功(9)
    };

    const query = tabQueryMap[this.data.activeTab];
    if (query) {
      Object.assign(params, query);
      console.log('【订单列表日志0.7】添加状态筛选:', query);
    }
    console.log('【订单列表日志0.8】最终查询参数:', params);
    
    // 调用获取订单列表云函数
    console.log('【订单列表日志0.9】准备调用order-list云函数');

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

          // 处理加载更多
          let mergedOrders = [];
          if (isLoadMore) {
            mergedOrders = [...this.data.orders, ...formattedOrders];
          } else {
            mergedOrders = formattedOrders;
          }
          
          // 更新分页信息
          const hasMore = res.result.data?.hasMore || false;
          
          // 终极修复：强制清空错误信息，确保万无一失
          this.setData({
            errorMsg: '', // 再次强制清空错误提示
            hasMore: hasMore
          }, () => {
            // 分片渲染，降低单次 setData 体积
            this.renderOrdersInChunks(mergedOrders);

            // 启动倒计时（仅对待支付或全部订单）
            const activeTab = this.data.activeTab;
            if (!activeTab || activeTab === 'all' || activeTab === 'unpaid') {
              this.countDown();
            } else {
              this.clearCountDownTimer();
            }

            console.log('【订单列表日志6】订单数据加载成功，共', mergedOrders.length, '条订单');
            console.log('【订单列表日志7】是否有更多数据:', hasMore);
            console.log('【订单列表日志8】当前errorMsg状态:', this.data.errorMsg); // 打印确认
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
          loading: false,
          isLoading: false // 🔥 解锁，允许下次点击
        });
      }
    });
  },

  // 价格数值归一（处理分/元、字符串）
  normalizePrice: function(price) {
    const num = Number(price);
    if (!isFinite(num)) return 0;
    // 如果是大于1000的整数，按分转元
    if (Number.isInteger(num) && num > 1000) return num / 100;
    // 其他情况直接返回数值
    return num;
  },

  // 将价格转为展示文案
  displayPrice: function(price) {
    const val = this.normalizePrice(price);
    return '¥' + val.toFixed(2);
  },

  // 创建时间格式化（兼容 Date/时间戳/字符串）
  formatCreateTime: function(raw) {
    if (!raw) return '未知时间';
    let date = null;
    if (raw instanceof Date) {
      date = raw;
    } else if (typeof raw === 'number') {
      date = new Date(raw);
    } else if (typeof raw === 'string') {
      const parsed = Date.parse(raw);
      if (!isNaN(parsed)) date = new Date(parsed);
    } else if (raw.$date) {
      date = new Date(raw.$date);
    }
    if (!date || isNaN(date.getTime())) return '未知时间';
    return orderUtil.formatOrderTime(date.getTime());
  },

  // 金额格式化函数（保留函数给内部使用）
  formatPrice: function(price) {
    return this.displayPrice(price);
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
          const price = this.normalizePrice(product.price || product.sale_price || 0);
          const quantity = Number(product.quantity || product.count || 1) || 1;
          const cover = product.cover_image || product.coverImage || product.image || '';
          return {
            ...product,
            productId,
            productName,
            price,
            quantity,
            cover_image: cover,
            displayPrice: this.displayPrice(price)
          };
        });
        
        // 计算商品总数
        const productCount = items.reduce((total, product) => {
          const quantity = Number(product.quantity) || 0;
          return total + quantity;
        }, 0);
        
        // 格式化创建时间（容错处理）
        const rawCreateTime = order.createTime || order.createdAt || order.create_time || order.create_at || '';
        const displayCreateTime = this.formatCreateTime(rawCreateTime);
        
        // 获取订单状态文本和颜色（确保statusmax存在）
        const status = order.statusmax || order.status || order.order_status || '';
        const statusText = this.getOrderStatusText(status);
        const statusColor = this.getOrderStatusColor(status);
        
        // 确保金额字段存在且为数字
        const totalPriceNum = this.normalizePrice(order.totalPrice || order.total_amount || order.totalAmount || 0);
        const deliveryFeeNum = this.normalizePrice(order.deliveryFee || order.shippingFee || order.freight || 0);
        const totalAmountNum = totalPriceNum + deliveryFeeNum;
        
        return {
          ...order,
          orderId,
          items,
          productCount,
          displayCreateTime,
          statusText,
          statusColor,
          totalPrice: totalPriceNum,
          deliveryFee: deliveryFeeNum,
          totalAmount: totalAmountNum,
          displayTotalPrice: this.displayPrice(totalPriceNum),
          displayDeliveryFee: this.displayPrice(deliveryFeeNum),
          displayTotalAmount: this.displayPrice(totalAmountNum)
        };
      } catch (e) {
        console.error('【formatOrders】格式化订单失败:', e, order);
        return {
          ...order,
          items: [],
          productCount: 0,
          displayCreateTime: '未知时间',
          statusText: '未知状态',
          statusColor: '#999',
          totalPrice: 0,
          deliveryFee: 0,
          totalAmount: 0,
          displayTotalPrice: this.displayPrice(0),
          displayDeliveryFee: this.displayPrice(0),
          displayTotalAmount: this.displayPrice(0)
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
    
    // 获取订单状态
    const order = this.data.orders.find(o => {
      const id = o.orderId || o.order_id || o.orderNo || o.out_trade_no || o._id;
      return id === orderId;
    });
    
    if (order) {
      const statusmax = order.statusmax;
      // 待支付、待接单状态可以取消，待配送状态不可取消
      if (statusmax === 3 || statusmax === '3') {
        wx.showToast({ title: '待配送状态不可取消', icon: 'none' });
        return;
      }
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



  // 管理订单
  manageOrder: function(e) {
    const orderId = e.currentTarget?.dataset?.orderId;
    console.log('【管理订单日志1】点击的订单ID:', orderId);
    console.log('【管理订单日志1.1】dataset:', e.currentTarget?.dataset);
    if (!orderId) {
      this.showError('订单信息获取失败');
      return;
    }

    // 获取订单状态
    const order = this.data.orders.find(o => {
      const id = o.orderId || o.order_id || o.orderNo || o.out_trade_no || o._id;
      console.log('【管理订单日志2】查找订单，当前订单ID:', id, '目标ID:', orderId);
      return id === orderId;
    });

    console.log('【管理订单日志3】找到的订单:', order);
    console.log('【管理订单日志3.1】当前订单列表:', this.data.orders);
    
    if (order && (order.statusmax === 1 || order.statusmax === '1')) {
      // 待支付状态：显示取消订单选项
      wx.showModal({
        title: '是否取消订单',
        content: '确定要取消该订单吗？',
        confirmText: '确定',
        cancelText: '取消',
        success: res => {
          if (res.confirm) {
            this.doCancelOrder(orderId);
          }
        }
      });
    } else {
      // 其他状态：显示删除订单选项
      wx.showModal({
        title: '是否删除订单',
        content: '确定要删除该订单吗？删除后您将无法在个人中心看到该订单，但后台数据会保留。',
        confirmText: '确定',
        cancelText: '取消',
        success: res => {
          if (res.confirm) {
            this.doDeleteOrder(orderId);
          }
        }
      });
    }
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
    console.log('【删除订单日志1】开始删除订单，orderId:', orderId);
    if (!orderId) {
      this.showError('订单信息错误');
      return;
    }

    this.setData({
      loading: true
    });

    wx.cloud.callFunction({
      name: 'order-delete',
      data: {
        orderId: orderId
      },
      success: res => {
        console.log('【删除订单日志2】云函数返回结果:', res);
        if (res?.result?.code === 200) {
          console.log('【删除订单日志3】删除成功');
          wx.showToast({
            title: '订单已删除',
            icon: 'success'
          });
          this.loadOrders();
        } else {
          console.log('【删除订单日志4】删除失败:', res?.result?.message);
          this.showError('删除订单失败：' + (res?.result?.message || '未知错误'));
        }
      },
      fail: err => {
        console.error('【删除订单日志5】云函数调用失败:', err);
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

  // 获取订单状态文本
  getOrderStatusText: function(status) {
    const statusMap = {
      1: '待支付',
      2: '待接单',
      3: '待配送',
      4: '配送中',
      5: '已完成',
      6: '已取消',
      7: '退款中',
      8: '退款失败',
      9: '退款成功',
      '1': '待支付',
      '2': '待接单',
      '3': '待配送',
      '4': '配送中',
      '5': '已完成',
      '6': '已取消',
      '7': '退款中',
      '8': '退款失败',
      '9': '退款成功'
    };
    return statusMap[status] || '未知状态';
  },

  // 获取订单状态颜色
  getOrderStatusColor: function(status) {
    const colorMap = {
      1: '#ff9500', // 待支付 - 橙色
      2: '#3498db', // 待接单 - 蓝色
      3: '#9b59b6', // 待配送 - 紫色
      4: '#f39c12', // 配送中 - 黄色
      5: '#27ae60', // 已完成 - 绿色
      6: '#95a5a6', // 已取消 - 灰色
      7: '#e74c3c', // 退款中 - 红色
      8: '#e74c3c', // 退款中 - 红色
      9: '#27ae60', // 退款成功 - 绿色
      '1': '#ff9500',
      '2': '#3498db',
      '3': '#9b59b6',
      '4': '#f39c12',
      '5': '#27ae60',
      '6': '#95a5a6',
      '7': '#e74c3c',
      '8': '#e74c3c',
      '9': '#27ae60'
    };
    return colorMap[status] || '#999';
  },

  // 页面下拉刷新
  onPullDownRefresh: function() {
    // 重新加载订单列表，在加载完成后停止刷新
    this.loadOrders(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 待支付订单倒计时核心方法（15分钟超时）
  countDown() {
    const that = this;
    const { orders, platform } = this.data;
    // 先清除旧定时器，避免重复创建
    this.clearCountDownTimer();

    // 启动新的定时器（每秒执行一次）
    const timer = setInterval(() => {
      let newOrders = [...orders];
      // 遍历所有订单，仅处理statusmax=1的待支付订单
      for (let i = 0; i < newOrders.length; i++) {
        const item = newOrders[i];
        if (item.statusmax !== 1 && item.statusmax !== '1') {
          delete newOrders[i].countdown; // 非待支付，删除倒计时字段
          continue;
        }

        // 订单创建时间：兼容云开发的serverDate（时间戳/字符串）
        let createdTime = item.createTime || item.createdAt;
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
          newOrders[i].countdown = timeUtil.formatMsToMinSec(timeDiff);
        } else {
          // 已超时：删除倒计时字段 + 自动取消订单
          delete newOrders[i].countdown;
          that.cancelOrderAuto(newOrders[i].orderId || newOrders[i]._id); // 调用自动取消订单方法
          // 超时后把订单状态置为已取消（前端临时更新，云函数会同步）
          newOrders[i].statusmax = '6';
          newOrders[i].statusText = '已取消';
        }
      }

      // 更新订单列表，页面自动刷新倒计时
      that.setData({
        orders: newOrders,
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

  // 页面上拉触底
  onReachBottom: function() {
    // 防重复加载
    if (this.data.isLoading || !this.data.hasMore) return;
    
    // 增加页码并加载更多
    this.setData({
      currentPage: this.data.currentPage + 1,
      isLoading: true
    }, () => {
      this.loadOrders(null, true);
    });
  },

  // 页面隐藏/卸载时清理计时器
  onHide: function() {
    this.clearAutoCancelTimer();
  },
  onUnload: function() {
    this.clearAutoCancelTimer();
  }
});
