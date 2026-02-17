// pages/user/user.js
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 用户信息
    userInfo: {
      avatar: "",
      nickName: "",
      phone: "",
      bannerBg: "",
    },
    // 卡券信息
    cardInfo: {
      couponCount: 0,
      exchangeCount: 0,
    },
    // 加载状态
    isLoading: true,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 加载用户数据
    this.checkLoginAndLoadData();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 页面显示时重新加载数据（比如从个人信息页返回后更新）
    this.checkLoginAndLoadData();
  },

  /**
   * 检查登录状态并加载数据
   */
  checkLoginAndLoadData: function () {
    console.log("检查登录状态...");
    const openid = wx.getStorageSync("openid");

    if (!openid) {
      console.log("用户未登录，跳转到授权页");
      wx.setStorageSync("targetPage", {
        url: "/pages/user/center/center",
        type: "switchTab",
      });
      wx.navigateTo({
        url: "/pages/login/auth/auth",
      });
      return;
    }

    console.log("用户已登录，开始加载用户数据");
    this.loadUserData();
  },

  // 加载用户数据（从云数据库读取）
  async loadUserData() {
    // 显示加载动画
    this.setData({ isLoading: true });

    try {
      // 调用云函数读取用户信息
      const res = await this.getUserInfoFromDB();

      // 模拟卡券数据
      const cardInfo = {
        couponCount: wx.getStorageSync("couponCount") || 4,
        exchangeCount: wx.getStorageSync("exchangeCount") || 0,
      };

      this.setData({
        userInfo: {
          avatar: res.avatarUrl || "",
          nickName: res.nickname || res.nickName || "微信用户",
          bannerBg: "",
        },
        cardInfo,
        isLoading: false,
      });
    } catch (err) {
      console.error("[我的页面] 加载用户数据失败：", err);
      this.setData({ isLoading: false });
    }
  },

  // 读取数据库中的最新用户信息
  async getUserInfoFromDB() {
    try {
      const openid = wx.getStorageSync("openid");
      if (!openid) {
        console.error("[我的页面] getUserInfoFromDB被调用，但openid为空");
        wx.showToast({ title: "登录状态异常", icon: "none" });
        return {};
      }

      // 调用云函数读取用户信息
      const res = await wx.cloud.callFunction({
        name: "user-get",
        data: { openid },
      });

      console.log("[我的页面] 读取用户信息结果：", res);
      if (res.result.code === 200 && res.result.data?.userInfo) {
        return res.result.data.userInfo; // 返回用户信息
      } else {
        console.log("[我的页面] 数据库无用户信息，跳转至完善信息页");
        // 无信息时自动跳转至个人信息页
        wx.navigateTo({ url: "/pages/user/profile/profile" });
        return {};
      }
    } catch (err) {
      console.error("[我的页面] 读取用户信息失败：", err);
      wx.showToast({ title: "读取信息失败", icon: "error" });
      return {};
    }
  },

  // 跳转到设置页面
  toSetting() {
    wx.navigateTo({
      url: "/pages/setting/setting",
      fail: () => wx.showToast({ title: "设置页面未配置", icon: "none" }),
    });
  },

  // 跳转到全部订单页面
  toAllOrders() {
    wx.navigateTo({
      url: "/pages/order/order",
      fail: () => wx.showToast({ title: "订单页面未配置", icon: "none" }),
    });
  },

  // 跳转到对应订单页面
  toOrder(e) {
    const orderType = e.currentTarget.dataset.type;
    wx.navigateTo({
      url: `/pages/order/order?type=${orderType}`,
      fail: () => wx.showToast({ title: "订单页面未配置", icon: "none" }),
    });
  },

  // 会员中心功能
  toMember() {
    wx.showToast({ title: "会员中心功能暂未开放", icon: "none" });
  },

  // 跳转到个人信息页
  toPersonalInfo() {
    wx.navigateTo({
      url: "/pages/user/profile/profile",
      fail: (err) => {
        console.error("跳转个人信息页失败：", err);
        wx.showToast({ title: "个人信息页未配置", icon: "none" });
      },
    });
  },

  // 优惠券功能
  toCoupon() {
    wx.showToast({ title: "优惠券功能暂未开放", icon: "none" });
  },

  // 跳转到兑换卡页面
  toExchange() {
    wx.navigateTo({
      url: "/pages/exchange/exchange",
      fail: () => wx.showToast({ title: "兑换卡页面未配置", icon: "none" }),
    });
  },

  // 跳转到服务页面
  toService(e) {
    const serviceType = e.currentTarget.dataset.type;

    if (serviceType === "address") {
      wx.navigateTo({
        url: "/pages/address/address",
        fail: () =>
          wx.showToast({ title: "地址管理页面未配置", icon: "none" }),
      });
      return;
    }

    if (serviceType === "about") {
      wx.navigateTo({
        url: "/pages/setting/setting",
        fail: () => wx.showToast({ title: "关于页面未配置", icon: "none" }),
      });
      return;
    }

    if (
      serviceType === "activity" ||
      serviceType === "customer" ||
      serviceType === "enterprise" ||
      serviceType === "invoice"
    ) {
      wx.showModal({
        title: "提示",
        content: "该功能正在研发中，敬请期待！",
        showCancel: false,
        confirmText: "确定",
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/service/service?type=${serviceType}`,
      fail: () => wx.showToast({ title: "服务页面未配置", icon: "none" }),
    });
  },
});
