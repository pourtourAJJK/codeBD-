const app = getApp()

Page({
  data: {
    fromPage: '/pages/index/index' // 记录登录来源页面，登录后跳回（解决之前只跳首页的问题）
  },

  onLoad(options) {
    // 保存来源页面（比如购物车/我的，登录后直接跳回）
    if (options.from) {
      this.setData({ fromPage: decodeURIComponent(options.from) })
    }
  },

  // 【关键】点击按钮前检查隐私授权（符合微信最新隐私规范）
  checkPrivacyBeforeAuth() {
    wx.getPrivacySetting({
      success: res => {
        // 如果需要用户同意隐私协议，先弹出授权弹窗
        if (res.needAuthorization) {
          wx.requirePrivacyAuthorize({
            success: () => {
              // 用户同意后，自动触发微信官方手机号授权弹窗
            },
            fail: () => {
              wx.showToast({ title: '需同意隐私协议才能授权', icon: 'none' })
            }
          })
        }
      }
    })
  },

  // 【核心】微信手机号快捷登录回调（完全复用你现有逻辑）
  handleGetPhoneNumber(e) {
    console.log("手机号授权回调", e.detail)

    // 1. 用户取消授权
    if (e.detail.errMsg === "getPhoneNumber:fail user deny") {
      wx.showToast({ title: "您已取消手机号授权", icon: "none" })
      return
    }

    // 2. 授权失败（隐私未生效/配置错误）
    if (e.detail.errMsg !== "getPhoneNumber:ok") {
      wx.showToast({ title: "授权失败，请重试", icon: "none" })
      return
    }

    // 3. 环境区分（完全保留你现有逻辑）
    const accountInfo = wx.getAccountInfoSync();
    const envVersion = accountInfo.miniProgram.envVersion; // 取值：develop(开发版)/trial(体验版)/release(正式版)
    if (envVersion !== 'release') {
      console.log('开发/体验版：临时放开手机号授权，直接进入首页');
      wx.showToast({ title: "开发环境，跳过绑定", icon: "none" })
      setTimeout(() => this.goBackToPage(), 1500)
      return
    }

    // 4. 正式版：调用你现有云函数解密手机号（100%无修改）
    wx.showLoading({ title: "绑定中..." })
    wx.cloud.callFunction({
      name: "user-decode-phone-v2",
      data: {
        encryptedData: e.detail.encryptedData,
        iv: e.detail.iv
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result.code === 0) {
        // 解密成功：存储手机号
        const phone = res.result.data.phoneNumber;
        wx.setStorageSync('userPhone', phone)
        
        wx.showToast({ title: "绑定成功", icon: "success" })
        // 登录后跳回来源页面（购物车/我的/首页）
        setTimeout(() => this.goBackToPage(), 1500)
      } else {
        wx.showToast({ title: res.result.message || "绑定失败", icon: "none" })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error("解密手机号失败", err)
      wx.showToast({ title: "绑定失败，请重试", icon: "none" })
    })
  },

  // 【优化】暂不绑定（加二次确认，避免用户误操作）
  skipBind() {
    wx.showModal({
      title: "温馨提示",
      content: "暂不绑定手机号将无法正常使用订单配送、售后联系等核心服务，是否继续？",
      success: res => {
        if (res.confirm) {
          this.goBackToPage()
        }
      }
    })
  },

  // 【通用】跳回来源页面（统一跳转逻辑）
  goBackToPage() {
    const { fromPage } = this.data
    // 如果是Tab页（购物车/我的），用switchTab；普通页用navigateTo
    if (fromPage.includes('cart') || fromPage.includes('center')) {
      wx.switchTab({ url: fromPage })
    } else {
      wx.navigateTo({ url: fromPage })
    }
  }
})
