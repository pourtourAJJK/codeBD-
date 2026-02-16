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
  handleAuthorize() {
    wx.showLoading({ title: "登录中..." });
    
    // 第一步：调用 wx.login 获取 code
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          wx.hideLoading();
          wx.showToast({ title: "获取登录凭证失败", icon: "none" });
          return;
        }
        
        console.log('[auth] 获取 code 成功:', loginRes.code);
        
        // 第二步：调用 get-openid-new 获取 openid
        wx.cloud.callFunction({
          name: "get-openid-new",
          data: { code: loginRes.code },
          success: (openidRes) => {
            console.log('[auth] get-openid-new 返回:', openidRes);
            
            if (openidRes.result.errCode !== 0) {
              wx.hideLoading();
              wx.showToast({ 
                title: openidRes.result.errMsg || "获取openid失败", 
                icon: "none" 
              });
              return;
            }
            
            const openid = openidRes.result.data.openid;
            const session_key = openidRes.result.data.session_key;
            wx.setStorageSync("openid", openid);
            console.log('[auth] openid 已保存:', openid);
            console.log('[auth] session_key 已获取:', session_key ? '是' : '否');
            
            // 第三步：调用 user-login-v2 完成登录/注册
            wx.cloud.callFunction({
              name: "user-login-v2",
              data: { 
                session_key: session_key  // ✅ 传递 session_key
              },
              success: (loginResult) => {
                console.log('[auth] user-login-v2 返回:', loginResult);
                
                if (loginResult.result && loginResult.result.code === 0) {
                  const { userInfo, token, isNewUser } = loginResult.result.data;
                  
                  // 保存用户信息和 token
                  wx.setStorageSync("userInfo", userInfo);
                  wx.setStorageSync("token", token);
                  
                  console.log('[auth] 登录成功，isNewUser:', isNewUser);
                  
                  // 跳转到手机号绑定页
                  wx.redirectTo({
                    url: "/pages/login/phone/phone",
                  });
                } else {
                  wx.showToast({ 
                    title: loginResult.result?.message || "登录失败", 
                    icon: "none" 
                  });
                }
              },
              fail: (err) => {
                wx.hideLoading();
                wx.showToast({ title: "调用登录云函数失败", icon: "none" });
                console.error("[user-login-v2] 调用失败", err);
              },
              complete: () => {
                wx.hideLoading();
              },
            });
          },
          fail: (err) => {
            wx.hideLoading();
            wx.showToast({ title: "获取openid失败", icon: "none" });
            console.error("[get-openid-new] 调用失败", err);
          },
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: "微信登录调用失败", icon: "none" });
      },
    });
  },
});

