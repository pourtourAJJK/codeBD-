/**
 * 订单管理页面逻辑（只用 statusmax 管理订单状态）
 */
const { API } = require('../../../../config/api');
const request = require('../../../../utils/request');

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
    // 筛选条件（只用 statusmax）
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
   * 格式化订单数据（只用 statusmax）
   * @param {Array} orders - 订单列表
   * @returns {Array} 格式化后的订单列表
   */
  formatOrders: function (orders) {
    if (!Array.isArray(orders)) {
      return [];
    }
    
    return orders.map(order => {
      // 只用 statusmax 获取订单状态信息
      const statusmax = order.statusmax || '1';
      const statusInfo = this.getStatusInfo(statusmax);
      
      return {
        ...order,
        statusmax: statusmax,
        statusText: statusInfo.text,
        statusColor: statusInfo.color
      };
    });
  },

  /**
   * 获取状态信息（只用 statusmax）
   * @param {string} statusmax - 状态码
   * @returns {Object} 状态信息
   */
  getStatusInfo: function (statusmax) {
    const statusMap = {
      '1': { text: '待支付', color: '#ff9800' },
      '2': { text: '待发货', color: '#2196f3' },
      '3': { text: '待配送', color: '#9c27b0' },
      '4': { text: '配送中', color: '#673ab7' },
      '5': { text: '已完成', color: '#4caf50' },
      '6': { text: '已取消', color: '#f44336' },
      '80': { text: '退货中', color: '#ff5722' },
      '90': { text: '已退款', color: '#795548' }
    };
    
    return statusMap[statusmax] || { text: '未知', color: '#999' };
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
   * 选择订单状态（只用 statusmax）
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
   * 更新订单状态（只用 statusmax）
   */
  updateOrderStatus: function (e) {
    const order = e.currentTarget.dataset.order;
    const operateType = e.currentTarget.dataset.operateType;
    
    if (!order || !operateType) return;
    
    const statusInfo = this.getStatusInfoByOperateType(operateType);
    
    // 确认更新
    wx.showModal({
      title: '更新订单状态',
      content: `确定要将订单 ${order.orderId} 更新为 ${statusInfo.text} 状态吗？`,
      success: (res) => {
        if (res.confirm) {
          // 调用更新订单状态接口
          this.doUpdateOrderStatus(order.orderId, operateType);
        }
      }
    });
  },

  /**
   * 根据操作类型获取状态信息
   */
  getStatusInfoByOperateType: function (operateType) {
    const map = {
      'confirmDelivery': { text: '待配送', statusmax: '3' },
      'startShipping': { text: '配送中', statusmax: '4' },
      'completeOrder': { text: '已完成', statusmax: '5' }
    };
    return map[operateType] || { text: '未知', statusmax: '' };
  },

  /**
   * 执行更新订单状态（调用云函数）
   */
  doUpdateOrderStatus: function (orderId, operateType) {
    wx.showLoading({
      title: '更新中...'
    });
    
    // 调用 admin-order-update 云函数
    wx.cloud.callFunction({
      name: 'admin-order-update',
      data: {
        orderId: orderId,
        operateType: operateType
      }
    }).then(res => {
      if (res.result.code === 0) {
        wx.showToast({
          title: '状态更新成功',
          icon: 'success'
        });
        
        // 重新加载订单数据
        this.loadOrders();
      } else {
        wx.showToast({
          title: res.result.msg || '更新失败',
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
          // 取消订单直接设置 statusmax 为 6
          this.doUpdateOrderStatus(order.orderId, 'cancel');
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
   * 批量接单（statusmax: 1->2）
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
          this.batchUpdateStatus('confirmDelivery');
        }
      }
    });
  },

  /**
   * 批量配送（statusmax: 2->4）
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
          this.batchUpdateStatus('startShipping');
        }
      }
    });
  },

  /**
   * 批量更新订单状态
   */
  batchUpdateStatus: function (operateType) {
    wx.showLoading({
      title: '处理中...',
      mask: true
    });
    
    // 批量调用云函数
    const promises = this.data.selectedOrders.map(orderId => {
      return wx.cloud.callFunction({
        name: 'admin-order-update',
        data: {
          orderId: orderId,
          operateType: operateType
        }
      });
    });
    
    Promise.all(promises).then(results => {
      const successCount = results.filter(r => r.result.code === 0).length;
      const failCount = results.length - successCount;
      
      wx.showToast({
        title: `成功${successCount}个，失败${failCount}个`,
        icon: 'none'
      });
      
      // 清空选择
      this.clearSelection();
      // 重新加载订单数据
      this.loadOrders();
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
