// 用户优惠券页面
const request = require('../../utils/request');
const dateUtil = require('../../utils/dateUtil');
const app = getApp();

Page({
  data: {
    coupons: [], // 优惠券列表
    activeTab: 'available', // 当前激活的标签
    availableCount: 0, // 可用优惠券数量
    usedCount: 0, // 已使用优惠券数量
    expiredCount: 0 // 已过期优惠券数量
  },

  onLoad: function (options) {
    // 加载用户优惠券数据
    this.loadUserCoupons();
  },

  onShow: function () {
    // 页面显示时重新加载数据
    this.loadUserCoupons();
  },

  // 加载用户优惠券
  loadUserCoupons: async function () {
    try {
      wx.showLoading({ title: '加载中...' });
      
      const result = await request.post({
        url: '/user/coupons',
        data: {
          userId: app.globalData.userId
        }
      });

      if (result.code === 0) {
        const coupons = result.data;
        
        // 处理优惠券数据，格式化日期等
        const processedCoupons = coupons.map(coupon => {
          return {
            ...coupon,
            expireDate: dateUtil.formatDate(new Date(coupon.expireDate)),
            useDate: coupon.useDate ? dateUtil.formatDate(new Date(coupon.useDate)) : ''
          };
        });

        // 计算各状态优惠券数量
        const availableCount = processedCoupons.filter(c => c.status === 'available').length;
        const usedCount = processedCoupons.filter(c => c.status === 'used').length;
        const expiredCount = processedCoupons.filter(c => c.status === 'expired').length;

        this.setData({
          coupons: processedCoupons,
          availableCount: availableCount,
          usedCount: usedCount,
          expiredCount: expiredCount
        });

        // 过滤显示当前标签的优惠券
        this.filterCouponsByTab();
      } else {
        wx.showToast({ title: '加载失败', icon: 'error' });
      }
    } catch (error) {
      console.error('加载优惠券失败:', error);
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  // 根据当前标签过滤优惠券
  filterCouponsByTab: function () {
    const { coupons, activeTab } = this.data;
    let filteredCoupons = coupons;

    if (activeTab === 'available') {
      filteredCoupons = coupons.filter(c => c.status === 'available');
    } else if (activeTab === 'used') {
      filteredCoupons = coupons.filter(c => c.status === 'used');
    } else if (activeTab === 'expired') {
      filteredCoupons = coupons.filter(c => c.status === 'expired');
    }

    this.setData({
      displayCoupons: filteredCoupons
    });
  },

  // 切换标签
  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
    this.filterCouponsByTab();
  },

  // 显示优惠券详情
  showCouponDetail: function (e) {
    const coupon = e.currentTarget.dataset.coupon;
    wx.showModal({
      title: coupon.name,
      content: `价值: ¥${coupon.value}\n类型: ${this.getCouponTypeName(coupon.type)}\n有效期: 至 ${coupon.expireDate}`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 获取优惠券类型名称
  getCouponTypeName: function (type) {
    const typeNames = {
      'discount': '折扣券',
      'full_reduction': '满减券',
      'cash': '现金券'
    };
    return typeNames[type] || '未知类型';
  },

  // 返回上一页
  navigateBack: function () {
    wx.navigateBack();
  },

  // 导航到领券中心
  navigateToReceiveCoupons: function () {
    wx.navigateTo({
      url: '/pages/user/receive-coupons/receive-coupons'
    });
  }
});