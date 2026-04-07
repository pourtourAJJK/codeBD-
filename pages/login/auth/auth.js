// pages/login/auth/auth.js
Page({
  /**
   * 页面的初始数据
   */
  data: {},

  /**
   * 授权登录
   * 流程：wx.login -> get-openid-new -> user-login-v2 -> 跳转手机号绑定页
   */
  // 隐私授权同意后才能调用登录接口
  handleAgreePrivacy() {
    console.log('用户已同意隐私协议，开始登录流程');
    this.doLogin(); // 真正的登录逻辑移到这里
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
        
        // 跳转到手机号绑定页
        wx.redirectTo({
          url: "/pages/login/phone/phone",
        });
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
});

