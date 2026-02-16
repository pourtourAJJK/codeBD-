/**
 * 仪表盘页面逻辑
 */
const { API } = require('../../../config/api');
const request = require('../../../utils/request');
const { STORAGE_KEY } = require('../../../config/constants');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 管理员信息
    adminInfo: {},
    // 今日订单数
    todayOrders: 0,
    // 今日销售额
    todaySales: 0,
    // 在线用户数
    onlineUsers: 0,
    // 待处理订单数
    pendingOrders: 0,
    // 销售趋势数据
    salesTrend: [],
    // 热销商品列表
    popularProducts: [],
    // 最新订单列表
    latestOrders: [],
    // 销售趋势最大值（用于计算柱状图高度）
    totalMax: 1
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 检查登录状态
    this.checkLoginStatus();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 加载管理员信息
    this.loadAdminInfo();
    // 加载统计数据
    this.loadStatistics();
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus: function () {
    const adminInfo = wx.getStorageSync(STORAGE_KEY.ADMIN_INFO);
    const token = wx.getStorageSync(STORAGE_KEY.ADMIN_TOKEN);
    
    if (!adminInfo || !token) {
      // 未登录，跳转到登录页面
      wx.redirectTo({
        url: '/pages/admin/login/login'
      });
    }
  },

  /**
   * 加载管理员信息
   */
  loadAdminInfo: function () {
    const adminInfo = wx.getStorageSync(STORAGE_KEY.ADMIN_INFO);
    if (adminInfo) {
      this.setData({
        adminInfo: adminInfo
      });
    }
  },

  /**
   * 加载统计数据
   */
  loadStatistics: function () {
    wx.showLoading({
      title: '加载中...'
    });
    
    // 调用获取统计数据接口
    request({
      url: API.ADMIN_GET_STATISTICS,
      method: 'GET'
    }).then(res => {
      if (res.code === 0) {
        const data = res.data;
        
        // 计算销售趋势最大值
        const salesValues = data.salesTrend.map(item => item.value);
        const totalMax = Math.max(...salesValues, 1);
        
        this.setData({
          todayOrders: data.todayOrders,
          todaySales: data.todaySales,
          onlineUsers: data.onlineUsers,
          pendingOrders: data.pendingOrders,
          salesTrend: data.salesTrend,
          popularProducts: data.popularProducts,
          latestOrders: data.latestOrders,
          totalMax: totalMax
        });
      } else {
        wx.showToast({
          title: res.message || '获取数据失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('获取统计数据失败:', err);
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      });
    }).finally(() => {
      wx.hideLoading();
    });
  },

  /**
   * 跳转到订单管理页面
   */
  navigateToOrders: function () {
    wx.navigateTo({
      url: '/pages/admin/order/manage'
    });
  },

  /**
   * 跳转到销售额页面
   */
  navigateToSales: function () {
    wx.navigateTo({
      url: '/pages/admin/sales/sales'
    });
  },

  /**
   * 跳转到用户管理页面
   */
  navigateToUsers: function () {
    wx.navigateTo({
      url: '/pages/admin/user/manage'
    });
  },

  /**
   * 跳转到待处理订单页面
   */
  navigateToPendingOrders: function () {
    wx.navigateTo({
      url: '/pages/admin/order/manage?status=pending'
    });
  },

  /**
   * 跳转到产品管理页面
   */
  navigateToProducts: function () {
    wx.navigateTo({
      url: '/pages/admin/product/manage'
    });
  },

  /**
   * 跳转到添加商品页面
   */
  navigateToAddProduct: function () {
    wx.navigateTo({
      url: '/pages/admin/product/add/add'
    });
  },

  /**
   * 退出登录
   */
  onLogout: function () {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地缓存
          wx.removeStorageSync(STORAGE_KEY.ADMIN_INFO);
          wx.removeStorageSync(STORAGE_KEY.ADMIN_TOKEN);
          
          // 跳转到登录页面
          wx.redirectTo({
            url: '/pages/admin/login/login'
          });
        }
      }
    });
  },

  /**
   * 页面下拉刷新
   */
  onPullDownRefresh: function () {
    // 重新加载数据
    this.loadStatistics();
    // 停止下拉刷新
    wx.stopPullDownRefresh();
  }
});