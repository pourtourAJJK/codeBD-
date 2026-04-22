const app = getApp()

Page({
  data: {
    fromPage: '/pages/index/index', // 记录登录来源页面，登录后跳回（解决之前只跳首页的问题）
    isNewUser: false, // 是否是新用户
    hasPhone: false, // 是否已绑定手机号
    isAgree: false // 合规核心：默认不勾选隐私协议
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

  // 勾选框切换
  onAgreeChange(e) {
    console.log('phone.js checkbox-group 事件详情:', e);
    console.log('phone.js checkbox-group 事件 detail:', e.detail);
    console.log('phone.js checkbox-group 事件 value:', e.detail.value);
    
    // 检查是否包含 'agree' 值
    const isChecked = e.detail.value && e.detail.value.includes('agree');
    console.log('phone.js 是否勾选:', isChecked);
    
    this.setData({
      isAgree: isChecked
    });
    
    // 延迟检查状态是否更新成功
    setTimeout(() => {
      console.log('phone.js 更新后的 isAgree 状态:', this.data.isAgree);
    }, 100);
  },

  // 【关键】点击按钮前检查隐私授权（符合微信最新隐私规范）
  checkPrivacyBeforeAuth() {
    // 检查协议勾选状态
    if (!this.data.isAgree) {
      wx.showToast({ title: '请先同意协议', icon: 'none' });
      return;
    }
    
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

  // 手机号授权回调
  getPhoneNumberHandler(e) {
    console.log("手机号授权回调", e);
    // 🔥 核心修复：新版接口取 code，不是 cloudID
    const code = e.detail.code;
    
    if (!code) {
      wx.showToast({ title: '授权失败', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '绑定中...' });
    // 调用云函数，传 code
    wx.cloud.callFunction({
      name: 'user-decode-phone-v2',
      data: { code: code },
      success: (res) => {
        wx.hideLoading();
        console.log("绑定结果：", res);
        if (res.result.code === 200) {
          wx.showToast({ title: '绑定成功' });
          
          // 检查用户是否为新用户
          const isNewUser = res.result.data && res.result.data.isNewUser;
          if (isNewUser) {
            // 新用户，跳转到个人中心完善信息
            wx.redirectTo({ url: '/pages/user/profile/profile' });
          } else {
            // 老用户，跳转到首页
            wx.redirectTo({ url: '/pages/index/index' });
          }
        } else {
          wx.showToast({ title: res.result.message, icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '绑定失败', icon: 'none' });
      }
    });
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
  },

  // 打开用户服务协议
  openUserAgreement() {
    // 使用微信官方接口打开用户服务协议
    wx.openPrivacyContract({
      success: function(res) {
        console.log('打开用户服务协议成功', res)
      },
      fail: function(err) {
        console.error('打开用户服务协议失败', err)
      }
    })
  }
})
