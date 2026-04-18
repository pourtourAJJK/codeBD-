// pages/login/auth/auth.js
Page({
  data: {
    fromPage: '/pages/index/index' // 记录登录来源页面，登录后跳回
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

  /**
   * 授权登录
   * 流程：wx.login -> get-openid-new -> user-login-v2 -> 跳转手机号绑定页
   */
  // 官方隐私授权成功回调（用户同意隐私后才会触发）
  handleAgreePrivacy(res) {
    console.log('隐私授权回调:', res.detail.event);
    
    // 👇 环境判断：仅开发/体验版（灰度期）临时放开，正式版强制走合规逻辑
    const accountInfo = wx.getAccountInfoSync();
    const envVersion = accountInfo.miniProgram.envVersion; // 取值：develop(开发版)/trial(体验版)/release(正式版)

    // 正式版：严格走隐私授权判断（完全合规）
    if (envVersion === 'release') {
      if (res.detail.event === 'agree') {
        // 用户同意隐私：执行登录逻辑
        console.log('用户已同意隐私协议，开始登录流程');
        this.doLogin();
      } else {
        // 用户拒绝隐私：提示并停留在当前页
        wx.showToast({ title: '请同意隐私协议后登录', icon: 'none' });
      }
      return;
    }

    // 开发/体验版（灰度期）：临时放开，直接登录，不影响测试
    console.log('开发/体验版：临时放开隐私授权，直接登录');
    this.doLogin();
  },

  // 登录核心逻辑（必须在隐私授权后执行）
  async doLogin() {
    try {
      wx.showLoading({ title: '登录中...' });
      
      // 1. 调用wx.login获取code（隐私接口，必须授权后调用）
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });
      
      if (!loginRes.code) {
        throw new Error('获取登录凭证失败');
      }
      
      console.log('[auth] 获取 code 成功:', loginRes.code);
      
      // 2. 直接调用 user-login-v2 完成登录/注册
      const loginResult = await wx.cloud.callFunction({
        name: "user-login-v2",
        data: { 
          code: loginRes.code
        }
      });
      
      console.log('[auth] user-login-v2 返回:', loginResult);
      
      if (loginResult.result && loginResult.result.code === 0) {
        const { userInfo, token, openid, isNewUser } = loginResult.result.data;
        
        // 加密存储
        wx.setStorageSync("userInfo", encodeURIComponent(JSON.stringify(userInfo)));
        wx.setStorageSync("token", encodeURIComponent(token));
        wx.setStorageSync("openid", encodeURIComponent(openid));
        
        console.log('[auth] 登录成功，isNewUser:', isNewUser);
        console.log('[auth] 用户信息:', userInfo);
        
        // 检查用户是否已绑定手机号
        const hasPhone = userInfo.phoneNumber && userInfo.phoneNumber.trim() !== '';
        console.log('[auth] 是否已绑定手机号:', hasPhone);
        
        if (isNewUser || !hasPhone) {
          // 新用户或未绑定手机号，跳转到手机号绑定页
          wx.redirectTo({
            url: `/pages/login/phone/phone?from=${encodeURIComponent(this.data.fromPage)}&isNewUser=${isNewUser}&hasPhone=${hasPhone}`,
          });
        } else {
          // 老用户且已绑定手机号，跳转到首页
          wx.switchTab({
            url: '/pages/index/index',
          });
        }
      } else {
        throw new Error(loginResult.result?.message || "登录失败");
      }
    } catch (err) {
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
      console.error('登录异常', err);
    } finally {
      wx.hideLoading();
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

  // 退出登录页面，回到首页
  exitLogin() {
    wx.switchTab({ url: '/pages/index/index' })
  }
});

