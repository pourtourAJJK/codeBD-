Page({
  data: {},
  // 微信官方原生手机号授权
  async handleGetPhoneNumber(e) {
    if (e.detail.errMsg !== "getPhoneNumber:ok") {
      wx.showToast({ title: "已取消", icon: "none" });
      return;
    }
    // 调用解密云函数
    wx.cloud.callFunction({
      name: "user-decode-phone-v2",
      data: { encryptedData: e.detail.encryptedData, iv: e.detail.iv },
      success: (res) => {
        const phone = res.result.data.phoneNumber;
        wx.setStorageSync("userPhone", phone);
        wx.showToast({ title: "绑定成功" });
        setTimeout(() => wx.switchTab({ url: "/pages/index/index" }), 1500);
      }
    });
  },
  // 暂不绑定跳过
  skipBind() {
    wx.switchTab({ url: "/pages/index/index" });
  }
});
