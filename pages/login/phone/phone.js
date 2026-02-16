// pages/login/phone/phone.js
Page({
  /**
   * 页面的初始数据
   */
  data: {},

  /**
   * 用户授权手机号
   */
  handleGetPhoneNumber: function (e) {
    if (e.detail.errMsg !== "getPhoneNumber:ok") {
      wx.showToast({ title: "授权失败", icon: "none" });
      return;
    }
    wx.showLoading({ title: "绑定中..." });
    wx.cloud.callFunction({
      name: "user-decode-phone-v2",
      data: {
        encryptedData: e.detail.encryptedData,
        iv: e.detail.iv,
      },
      success: (res) => {
        console.log('[phone] user-decode-phone-v2 返回:', res);
        wx.hideLoading();  // ✅ 移到这里,避免 complete 中重复调用
        
        if (res.result && res.result.code === 200) {
          wx.setStorageSync("phone", res.result.data.phoneNumber);
          wx.showToast({ title: "手机号绑定成功", icon: "success", duration: 1500 });
          
          console.log('[phone] 准备检查地址...');
          // 绑定成功,检查地址
          setTimeout(() => {
            console.log('[phone] 开始检查地址');
            this.checkAddressAndRedirect();
          }, 1500);
        } else {
          const errMsg = res.result?.message || "绑定失败";
          console.error('[phone] 绑定失败:', errMsg);
          wx.showToast({ title: errMsg, icon: "none", duration: 3000 });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: "调用绑定函数失败", icon: "none" });
        console.error("[phone] 调用失败:", err);
      },
    });
  },

  /**
   * 检查地址并重定向
   */
  checkAddressAndRedirect: function () {
    console.log('[phone] 开始调用 address-list 云函数...');
    
    wx.cloud.callFunction({
      name: "address-list",
      success: (res) => {
        console.log('[phone] address-list 返回:', res);
        
        if (res.result && res.result.data && res.result.data.length > 0) {
          // 有地址，跳转到最终目标页
          console.log('[phone] 用户已有地址,跳转到目标页');
          this.redirectToTargetPage();
        } else {
          // 无地址，跳转到新增地址页
          console.log('[phone] 用户没有地址,跳转到新增地址页');
          wx.redirectTo({
            url: "/pages/address/new/new",  // ✅ 修正路径
          });
        }
      },
      fail: (err) => {
        console.error("[phone] address-list 调用失败:", err);
        // 查询失败，也先跳到目标页，避免流程卡住
        console.log('[phone] 查询失败,跳转到目标页');
        this.redirectToTargetPage();
      },
    });
  },

  /**
   * 跳转到最初的目标页面
   */
  redirectToTargetPage: function () {
    const targetPage = wx.getStorageSync("targetPage");
    console.log('[phone] 读取 targetPage:', targetPage);
    
    wx.removeStorageSync("targetPage"); // 用完即删

    if (targetPage && targetPage.url) {
      console.log('[phone] 跳转到目标页:', targetPage.url, '类型:', targetPage.type);
      if (targetPage.type === "switchTab") {
        wx.switchTab({ url: targetPage.url });
      } else {
        wx.redirectTo({ url: targetPage.url });
      }
    } else {
      // 默认回到首页
      console.log('[phone] 没有目标页,跳转到首页');
      wx.switchTab({ url: "/pages/index/index" });
    }
  },

  /**
   * 暂不绑定
   */
  handleSkip: function () {
    wx.showModal({
        title: '提示',
        content: '为了方便后续为您提供服务，建议您绑定手机号。确定要跳过吗？',
        success: (res) => {
            if (res.confirm) {
                // 用户确认跳过，直接跳转到目标页
                this.redirectToTargetPage();
            }
        }
    })
  },
});
