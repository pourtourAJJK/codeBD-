Page({
  data: {},
  // 官方手机号授权回调（用户同意/拒绝后触发）
  handleGetPhoneNumber(e) {
    console.log('手机号授权回调:', e.detail.errMsg);
    
    // 👇 环境判断：仅开发/体验版（灰度期）临时放开，正式版强制走合规逻辑
    const accountInfo = wx.getAccountInfoSync();
    const envVersion = accountInfo.miniProgram.envVersion; // 取值：develop(开发版)/trial(体验版)/release(正式版)

    // 开发/体验版（灰度期）：临时放开，直接进入首页，不影响测试
    if (envVersion !== 'release') {
      console.log('开发/体验版：临时放开手机号授权，直接进入首页');
      wx.showToast({ title: '开发/体验版：跳过手机号绑定', icon: 'none' });
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 1500);
      return;
    }

    // 正式版：严格走手机号授权判断（完全合规）
    // 用户拒绝授权
    if (e.detail.errMsg !== "getPhoneNumber:ok") {
      wx.showToast({ title: '已取消授权，可后续在个人中心绑定', icon: 'none' });
      // 拒绝后直接进入首页，不限制使用
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 1500);
      return;
    }

    // 用户同意授权：调用云函数解密手机号
    wx.cloud.callFunction({
      name: "user-decode-phone-v2",
      data: {
        encryptedData: e.detail.encryptedData,
        iv: e.detail.iv
      },
      success: (res) => {
        if (res.result.code === 0) {
          const phone = res.result.data.phoneNumber;
          wx.setStorageSync("userPhone", phone);
          wx.showToast({ title: '绑定成功' });
          // 绑定成功进入首页
          setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 1500);
        } else {
          wx.showToast({ title: '绑定失败，请重试', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '绑定失败，请重试', icon: 'none' });
      }
    });
  },
  // 暂不绑定跳过
  skipBind() {
    wx.switchTab({ url: "/pages/index/index" });
  }
});
