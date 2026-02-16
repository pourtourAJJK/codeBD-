/**
 * 登录状态工具类
 * 提供完整的登录态管理方法
 */
const auth = {
  /**
   * 检查用户是否已登录
   * @return {boolean} 是否登录
   */
  isLoggedIn() {
    const app = getApp();
    // 检查全局变量中的openid（优先）或本地存储的token
    if (app.globalData && app.globalData.openid) {
      return true;
    }
    const token = wx.getStorageSync('token');
    return !!token; // 存在token则认为已登录
  },

  /**
   * 获取当前用户openid
   * @return {string|null} openid或null
   */
  getOpenid() {
    const app = getApp();
    
    // 1. 优先从全局变量获取
    if (app.globalData && app.globalData.openid) {
      return app.globalData.openid;
    }
    
    // 2. 从本地存储获取
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo && userInfo.openid) {
        // 更新全局变量，避免下次再获取
        if (app.globalData) {
          app.globalData.openid = userInfo.openid;
        }
        return userInfo.openid;
      }
      
      // 3. 从本地存储直接获取openid
      const localOpenid = wx.getStorageSync('openid');
      if (localOpenid) {
        if (app.globalData) {
          app.globalData.openid = localOpenid;
        }
        return localOpenid;
      }
    } catch (error) {
      console.error('获取openid失败:', error);
    }
    
    return null;
  },

  /**
   * 获取用户信息
   * @return {object|null} 用户信息或null
   */
  getUserInfo() {
    return wx.getStorageSync('userInfo') || null;
  },

  /**
   * 登录方法
   * 兼容wx.weixinAppLogin（多端应用）和wx.login（纯小程序）两种方式
   * @param {object} options - 登录选项
   * @param {string} options.code - 登录code
   * @param {string} options.phoneNumber - 手机号（可选）
   * @return {Promise} 登录结果Promise
   */
  login(options = {}) {
    return new Promise((resolve, reject) => {
      // 先检查会话是否有效，避免频繁调用wx.login
      wx.checkSession({
        success: () => {
          // 会话有效，直接调用登录云函数
          console.log('会话有效，直接调用登录云函数');
          this._callLoginCloudFunction(options).then(resolve).catch(reject);
        },
        fail: () => {
          // 会话过期，需要重新登录
          console.log('会话过期，需要重新登录');
          // 检查是否已有code
          if (options.code) {
            // 已有code，直接调用登录云函数
            this._callLoginCloudFunction(options).then(resolve).catch(reject);
          } else {
            // 无code，调用wx.login获取code
            wx.login({
              success: (res) => {
                if (res.code) {
                  // 使用获取到的code调用登录云函数
                  this._callLoginCloudFunction({ ...options, code: res.code }).then(resolve).catch(reject);
                } else {
                  reject(new Error('登录失败: ' + res.errMsg));
                }
              },
              fail: (error) => {
                console.error('wx.login调用失败:', error);
                reject(new Error('wx.login调用失败: ' + error.errMsg));
              }
            });
          }
        }
      });
    });
  },

  /**
   * 调用登录云函数
   * @private
   * @param {object} options - 登录选项
   * @return {Promise} 登录结果Promise
   */
  _callLoginCloudFunction(options = {}) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'user-login',
        data: options,
        success: (res) => {
          console.log('登录云函数调用成功:', res);
          if (res.result.code === 200) {
            const { userInfo, token, openid } = res.result.data || {};
            
            // 保存登录状态
            this.saveLoginStatus({ userInfo, token, openid });
            
            resolve(res.result.data || {});
          } else {
            reject(new Error(res.result.message || '登录失败'));
          }
        },
        fail: (error) => {
          console.error('登录云函数调用失败:', error);
          // 降级使用旧的登录方式
          this._legacyLogin().then(resolve).catch(reject);
        }
      });
    });
  },

  /**
   * 旧的登录方式（降级方案）
   * @private
   * @return {Promise} 登录结果Promise
   */
  _legacyLogin() {
    return new Promise((resolve, reject) => {
      // 微信登录流程
      wx.login({
        success: (res) => {
          if (res.code) {
            // 使用util-get-openid获取openid
            wx.cloud.callFunction({
              name: 'util-get-openid',
              data: {},
              success: (cloudRes) => {
                const openid = cloudRes.result?.data?.openid;
                if (openid) {
                  // 构建用户信息
                  const userInfo = {
                    openid: openid,
                    token: 'token_' + openid + '_' + Date.now()
                  };
                  
                  // 保存登录状态
                  this.saveLoginStatus({ userInfo, token: userInfo.token, openid });
                  
                  resolve(userInfo);
                } else {
                  reject(new Error(cloudRes.result.message || '登录失败'));
                }
              },
              fail: (error) => {
                reject(new Error('云函数调用失败: ' + error.errMsg));
              }
            });
          } else {
            reject(new Error('登录失败: ' + res.errMsg));
          }
        },
        fail: (error) => {
          reject(new Error('wx.login调用失败: ' + error.errMsg));
        }
      });
    });
  },

  /**
   * 保存登录状态
   * @param {object} options - 登录状态选项
   * @param {object} options.userInfo - 用户信息
   * @param {string} options.token - 登录token
   * @param {string} options.openid - 用户openid
   */
  saveLoginStatus({ userInfo, token, openid }) {
    const app = getApp();
    
    // 更新全局变量
    if (app.globalData) {
      app.globalData.openid = openid;
      app.globalData.userInfo = userInfo;
      app.globalData.loginReady = true;
    }
    
    // 保存到本地存储
    wx.setStorageSync('userInfo', userInfo);
    wx.setStorageSync('token', token);
    wx.setStorageSync('openid', openid);
  },

  /**
   * 清除登录状态
   */
  clearLoginStatus() {
    const app = getApp();
    if (app.globalData) {
      app.globalData.openid = null;
      app.globalData.userInfo = null;
      app.globalData.loginReady = false;
    }
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('openid');
  },

  /**
   * 获取登录token
   * @return {string|null} token或null
   */
  getToken() {
    return wx.getStorageSync('token') || null;
  }
};

module.exports = auth;