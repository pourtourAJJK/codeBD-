// pages/login/auth/auth.js
Page({
  data: {
    fromPage: '/pages/index/index', // 记录登录来源页面，登录后跳回
    isAgree: false // 合规核心：默认不勾选隐私协议
  },

  onLoad(options) {
    // 保存来源页面（比如购物车/我的，登录后直接跳回）
    if (options.from) {
      this.setData({ fromPage: decodeURIComponent(options.from) })
    }
    
    // 页面加载时，检查隐私授权状态（兜底逻辑）
    wx.getPrivacySetting({
      success: (res) => {
        console.log('隐私授权状态:', res);
        if (!res.needAuthorization) {
          console.log('用户已同意隐私协议，可直接登录');
        }
      }
    });
  },

  // 页面显示时检查登录态
  onShow() {
    const app = getApp();
    const isLoggedIn = app.checkLoginStatus();
    
    if (isLoggedIn) {
      // 已登录，直接跳转到来源页面
      wx.redirectTo({
        url: this.data.fromPage,
      });
    }
  },

  // 勾选框切换
  onAgreeChange(e) {
    console.log('checkbox-group 事件详情:', e);
    console.log('checkbox-group 事件 detail:', e.detail);
    console.log('checkbox-group 事件 value:', e.detail.value);
    
    // 检查是否包含 'agree' 值
    const isChecked = e.detail.value && e.detail.value.includes('agree');
    console.log('是否勾选:', isChecked);
    
    this.setData({
      isAgree: isChecked
    });
    
    // 延迟检查状态是否更新成功
    setTimeout(() => {
      console.log('更新后的 isAgree 状态:', this.data.isAgree);
    }, 100);
  },

  /**
   * 授权登录
   * 流程：wx.login -> get-openid-new -> user-login-v2 -> 跳转手机号绑定页
   */
  // 登录按钮点击事件
  handleLogin() {
    console.log('登录按钮点击，开始登录流程');
    
    // 检查协议勾选状态
    if (!this.data.isAgree) {
      wx.showToast({ title: '请先同意协议', icon: 'none' });
      return;
    }
    
    // 检查隐私授权状态
    wx.getPrivacySetting({
      success: (res) => {
        console.log('隐私授权状态:', res);
        if (res.needAuthorization) {
          // 需要用户同意隐私协议，弹出授权弹窗
          wx.requirePrivacyAuthorize({
            success: () => {
              // 用户同意后，执行登录逻辑
              console.log('用户已同意隐私协议，开始登录流程');
              this.doLogin();
            },
            fail: () => {
              // 用户拒绝隐私协议
              wx.showToast({ title: '请同意隐私协议后登录', icon: 'none' });
            }
          });
        } else {
          // 用户已同意隐私协议，直接执行登录逻辑
          console.log('用户已同意隐私协议，直接登录');
          this.doLogin();
        }
      },
      fail: (err) => {
        console.error('获取隐私授权状态失败:', err);
        // 失败时直接执行登录逻辑
        this.doLogin();
      }
    });
  },

  // 完整的登录按钮逻辑
  async doLogin() {
    wx.showLoading({ title: '登录中...' })
    try {
      // 1. 获取code
      const loginRes = await wx.login()
      const code = loginRes.code
      console.log("[auth] 获取 code 成功:", code)

      // 2. 调用云函数
      const res = await wx.cloud.callFunction({
        name: 'user-login-v2',
        data: { code: code }
      })
      console.log("[auth] user-login-v2 返回:", res)

      // 3. 判断云函数返回结果
      if (res.result.code !== 0) {
        wx.hideLoading()
        wx.showToast({ title: res.result.message || '登录失败', icon: 'none' })
        return
      }

      // 4. 正常存储数据（标准写法，无报错）
      const data = res.result.data
      console.log("[auth] 登录成功，数据:", data);
      console.log("[auth] userInfo:", data.userInfo);
      console.log("[auth] phoneNumber:", data.userInfo && data.userInfo.phoneNumber);
      
      wx.setStorageSync('userInfo', data.userInfo)
      wx.setStorageSync('token', data.token)
      wx.setStorageSync('openid', data.openid)

      wx.hideLoading()
      
      // 检查用户是否已绑定手机号
      const userInfo = data.userInfo;
      console.log("[auth] 检查手机号绑定状态:", {
        hasUserInfo: !!userInfo,
        hasPhoneNumber: userInfo && userInfo.phoneNumber,
        phoneNumberTrimmed: userInfo && userInfo.phoneNumber && userInfo.phoneNumber.trim()
      });
      
      if (userInfo && userInfo.phoneNumber && userInfo.phoneNumber.trim() !== '') {
        // 已绑定手机号，直接跳转到首页（tabBar页面）
        console.log("[auth] 已绑定手机号，跳转到首页");
        wx.switchTab({ url: '/pages/index/index' });
      } else {
        // 未绑定手机号，跳转到绑定页面（非tabBar页面）
        console.log("[auth] 未绑定手机号，跳转到绑定页面");
        wx.redirectTo({ url: '/pages/login/phone/phone' });
      }

    } catch (error) {
      wx.hideLoading()
      console.error("登录异常", error)
      wx.showToast({ title: '登录失败，请重试', icon: 'none' })
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
  },

  // 退出登录页面，回到首页
  exitLogin() {
    wx.switchTab({ url: '/pages/index/index' })
  }
});

