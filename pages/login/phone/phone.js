const app = getApp()

Page({
  data: {
    fromPage: '/pages/index/index', // 记录登录来源页面，登录后跳回（解决之前只跳首页的问题）
    isNewUser: false, // 是否是新用户
    hasPhone: false // 是否已绑定手机号
  },

  onLoad(options) {
    // 保存来源页面（比如购物车/我的，登录后直接跳回）
    if (options.from) {
      this.setData({ fromPage: decodeURIComponent(options.from) })
    }
    // 保存用户信息状态
    if (options.isNewUser) {
      this.setData({ isNewUser: options.isNewUser === 'true' })
    }
    if (options.hasPhone) {
      this.setData({ hasPhone: options.hasPhone === 'true' })
    }
    console.log('phone.js 页面参数:', {
      fromPage: this.data.fromPage,
      isNewUser: this.data.isNewUser,
      hasPhone: this.data.hasPhone
    })
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

  // 【核心】微信手机号快捷登录回调
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

    // 3. 检查 cloudID 是否存在
    if (!e.detail.cloudID) {
      wx.showToast({ title: "授权失败，请重试", icon: "none" })
      return
    }

    // 4. 只传递 cloudID 给云函数
    wx.showLoading({ title: "绑定中..." })
    wx.cloud.callFunction({
      name: "user-decode-phone-v2",
      data: {
        cloudID: e.detail.cloudID
      }
    }).then(res => {
      wx.hideLoading()
      console.log("绑定结果：", res);
      if (res.result.code === 200) {
        // 解密成功：存储手机号
        const phone = res.result.data.phoneNumber;

        // 更新本地存储的用户信息
        if (res.result.data.userInfo) {
          wx.setStorageSync('userInfo', encodeURIComponent(JSON.stringify(res.result.data.userInfo)));
        }
        wx.setStorageSync('userPhone', phone)
        console.log("登录页已存储手机号：", phone);
        console.log("登录页已更新用户信息：", res.result.data.userInfo);

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
          // 直接跳转到首页
          wx.switchTab({ url: '/pages/index/index' })
        }
      }
    })
  },

  // 【通用】跳回来源页面（统一跳转逻辑）
  goBackToPage() {
    const { fromPage, isNewUser, hasPhone } = this.data
    console.log('phone.js goBackToPage 参数:', {
      fromPage,
      isNewUser,
      hasPhone
    })

    if (isNewUser) {
      // 新用户：跳转到个人中心
      console.log('新用户：跳转到个人中心')
      wx.redirectTo({
        url: '/pages/user/profile/profile'
      })
    } else if (!hasPhone) {
      // 老用户但没绑定手机：跳转到首页
      console.log('老用户但没绑定手机：跳转到首页')
      wx.switchTab({
        url: '/pages/index/index'
      })
    } else {
      // 其他情况：跳转到来源页面
      console.log('跳转到来源页面:', fromPage)
      if (fromPage.includes('cart') || fromPage.includes('center')) {
        wx.switchTab({ url: fromPage })
      } else {
        wx.navigateTo({ url: fromPage })
      }
    }
  },

  // 打开微信官方隐私协议页面
  openPrivacyContract() {
    wx.openPrivacyContract({
      success: function(res) {
        console.log('打开隐私协议成功', res)
      },
      fail: function(err) {
        console.error('打开隐私协议失败', err)
      }
    })
  }
})
