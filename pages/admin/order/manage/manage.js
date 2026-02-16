/**
 * 订单管理页面逻辑
 */
const { API } = require('../../../../config/api');
const request = require('../../../../utils/request');
const { ORDER_STATUS } = require('../../../../config/constants');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 订单列表
    orders: [],
    // 搜索关键词
    searchKeyword: '',
    // 加载状态
    loading: false,
    // 筛选面板显示状态
    showFilter: false,
    // 已选择的订单
    selectedOrders: [],
    // 筛选条件
    filters: {
      // 订单状态
      status: 'all',
      // 开始日期
      startDate: '',
      // 结束日期
      endDate: ''
    },
    // 当前分页
    page: 1,
    // 每页数量
    pageSize: 10,
    // 是否还有更多数据
    hasMore: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 设置默认日期范围为最近7天
    this.setDefaultDateRange();
    // 加载订单数据
    this.loadOrders();
  },

  /**
   * 设置默认日期范围
   */
  setDefaultDateRange: function () {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    // 格式化日期为YYYY-MM-DD
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    this.setData({
      filters: {
        ...this.data.filters,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
      }
    });
  },

  /**
   * 加载订单数据
   */
  loadOrders: function (isLoadMore = false) {
    if (this.data.loading || (!isLoadMore && !this.data.hasMore)) {
      return;
    }
    
    this.setData({
      loading: true
    });
    
    // 构建请求参数
    const params = {
      page: isLoadMore ? this.data.page + 1 : 1,
      pageSize: this.data.pageSize,
      keyword: this.data.searchKeyword,
      ...this.data.filters
    };
    
    // 调用获取订单列表接口
    request({
      url: API.ADMIN_GET_ORDERS,
      method: 'GET',
      data: params
    }).then(res => {
      if (res.code === 0) {
        const orders = res.data.orders;
        const newOrders = this.formatOrders(orders);
        
        this.setData({
          orders: isLoadMore ? [...this.data.orders, ...newOrders] : newOrders,
          page: params.page,
          hasMore: orders.length >= this.data.pageSize,
          loading: false
        });
      } else {
        wx.showToast({
          title: res.message || '获取订单失败',
          icon: 'none'
        });
        this.setData({
          loading: false
        });
      }
    }).catch(err => {
      console.error('获取订单失败:', err);
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      });
      this.setData({
        loading: false
      });
    });
  },

  /**
   * 格式化订单数据
   * @param {Array} orders - 订单列表
   * @returns {Array} 格式化后的订单列表
   */
  formatOrders: function (orders) {
    if (!Array.isArray(orders)) {
      return [];
    }
    
    return orders.map(order => {
      // 获取订单状态信息
      const statusInfo = ORDER_STATUS[order.status] || ORDER_STATUS.unknown;
      
      return {
        ...order,
        statusText: statusInfo.text,
        statusColor: statusInfo.color
      };
    });
  },

  /**
   * 搜索输入变化
   */
  onSearchInput: function (e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  /**
   * 清除搜索
   */
  clearSearch: function () {
    this.setData({
      searchKeyword: ''
    });
    // 重新加载订单数据
    this.loadOrders();
  },

  /**
   * 显示筛选面板
   */
  showFilterPanel: function () {
    this.setData({
      showFilter: true
    });
  },

  /**
   * 关闭筛选面板
   */
  closeFilterPanel: function () {
    this.setData({
      showFilter: false
    });
  },

  /**
   * 选择订单状态
   */
  selectStatus: function (e) {
    const status = e.currentTarget.dataset.status;
    
    this.setData({
      filters: {
        ...this.data.filters,
        status: status
      }
    });
  },

  /**
   * 开始日期变化
   */
  onStartDateChange: function (e) {
    this.setData({
      filters: {
        ...this.data.filters,
        startDate: e.detail.value
      }
    });
  },

  /**
   * 结束日期变化
   */
  onEndDateChange: function (e) {
    this.setData({
      filters: {
        ...this.data.filters,
        endDate: e.detail.value
      }
    });
  },

  /**
   * 重置筛选条件
   */
  resetFilter: function () {
    this.setDefaultDateRange();
    this.setData({
      filters: {
        ...this.data.filters,
        status: 'all'
      }
    });
  },

  /**
   * 应用筛选条件
   */
  applyFilter: function () {
    this.closeFilterPanel();
    // 重新加载订单数据
    this.loadOrders();
  },

  /**
   * 查看订单详情
   */
  viewOrderDetail: function (e) {
    const order = e.currentTarget.dataset.order;
    if (!order) return;
    
    // 这里可以跳转到订单详情页面
    wx.navigateTo({
      url: `/pages/admin/order/detail/detail?orderId=${order.orderId}`
    });
  },

  /**
   * 更新订单状态
   */
  updateOrderStatus: function (e) {
    const order = e.currentTarget.dataset.order;
    const newStatus = e.currentTarget.dataset.status;
    
    if (!order || !newStatus) return;
    
    // 确认更新
    wx.showModal({
      title: '更新订单状态',
      content: `确定要将订单 ${order.orderId} 更新为 ${ORDER_STATUS[newStatus].text} 状态吗？`,
      success: (res) => {
        if (res.confirm) {
          // 调用更新订单状态接口
          this.doUpdateOrderStatus(order.orderId, newStatus);
        }
      }
    });
  },

  /**
   * 执行更新订单状态
   */
  doUpdateOrderStatus: function (orderId, status) {
    wx.showLoading({
      title: '更新中...'
    });
    
    request({
      url: API.ADMIN_UPDATE_ORDER_STATUS,
      method: 'POST',
      data: {
        orderId: orderId,
        status: status
      }
    }).then(res => {
      if (res.code === 0) {
        wx.showToast({
          title: '状态更新成功',
          icon: 'success'
        });
        
        // 重新加载订单数据
        this.loadOrders();
      } else {
        wx.showToast({
          title: res.message || '更新失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('更新订单状态失败:', err);
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      });
    }).finally(() => {
      wx.hideLoading();
    });
  },

  /**
   * 取消订单
   */
  cancelOrder: function (e) {
    const order = e.currentTarget.dataset.order;
    
    if (!order) return;
    
    wx.showModal({
      title: '取消订单',
      content: `确定要取消订单 ${order.orderId} 吗？`,
      success: (res) => {
        if (res.confirm) {
          this.doUpdateOrderStatus(order.orderId, 'cancelled');
        }
      }
    });
  },

  /**
   * 选择订单
   */
  onOrderSelect: function (e) {
    const orderId = e.currentTarget.dataset.orderId;
    const isChecked = e.detail.value.length > 0;
    
    let selectedOrders = [...this.data.selectedOrders];
    
    if (isChecked && !selectedOrders.includes(orderId)) {
      selectedOrders.push(orderId);
    } else if (!isChecked && selectedOrders.includes(orderId)) {
      selectedOrders = selectedOrders.filter(id => id !== orderId);
    }
    
    this.setData({
      selectedOrders: selectedOrders
    });
  },

  /**
   * 批量接单
   */
  batchAccept: function () {
    if (this.data.selectedOrders.length === 0) {
      wx.showToast({
        title: '请选择要接单的订单',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '批量接单',
      content: `确定要批量接单 ${this.data.selectedOrders.length} 个订单吗？`,
      success: (res) => {
        if (res.confirm) {
          this.batchUpdateStatus('accepted');
        }
      }
    });
  },

  /**
   * 批量配送
   */
  batchShip: function () {
    if (this.data.selectedOrders.length === 0) {
      wx.showToast({
        title: '请选择要配送的订单',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '批量配送',
      content: `确定要批量标记 ${this.data.selectedOrders.length} 个订单为配送中吗？`,
      success: (res) => {
        if (res.confirm) {
          this.batchUpdateStatus('shipping');
        }
      }
    });
  },

  /**
   * 批量更新订单状态
   */
  batchUpdateStatus: function (status) {
    wx.showLoading({
      title: '处理中...',
      mask: true
    });
    
    request({
      url: API.ADMIN_BATCH_UPDATE_ORDER_STATUS,
      method: 'POST',
      data: {
        orderIds: this.data.selectedOrders,
        status: status
      }
    }).then(res => {
      if (res.code === 0) {
        wx.showToast({
          title: '批量操作成功',
          icon: 'success'
        });
        
        // 清空选择
        this.clearSelection();
        // 重新加载订单数据
        this.loadOrders();
      } else {
        wx.showToast({
          title: res.message || '批量操作失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('批量更新订单状态失败:', err);
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      });
    }).finally(() => {
      wx.hideLoading();
    });
  },

  /**
   * 清空选择
   */
  clearSelection: function () {
    this.setData({
      selectedOrders: []
    });
  },

  /**
   * 页面滚动到底部事件
   */
  onReachBottom: function () {
    // 加载更多订单数据
    if (this.data.hasMore && !this.data.loading) {
      this.loadOrders(true);
    }
  },

  /**
   * 页面下拉刷新
   */
  onPullDownRefresh: function () {
    // 重置分页
    this.setData({
      page: 1,
      hasMore: true
    });
    // 重新加载订单数据
    this.loadOrders();
    // 停止下拉刷新
    wx.stopPullDownRefresh();
  }
});