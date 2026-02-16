// 云函数测试页面逻辑
Page({
  data: {
    orderStatsResult: '',
    userProfileResult: '',
    localUserInfoResult: '',
    envCheckResult: '',
    cloudFunctionTestResult: ''
  },

  onLoad: function() {
    console.log('测试页面加载');
    // 自动执行环境检查
    this.checkCloudEnv();
  },

  // 检查当前云环境
  checkCloudEnv: function() {
    console.log('开始检查云环境...');
    
    // 获取应用实例
    const appInstance = getApp();
    
    // 初始化云开发环境（如果尚未初始化）
    if (wx.cloud) {
      // 移除对wx.cloud.getEnv的依赖
      // 直接使用应用配置的环境信息
      const envResult = {
        env: appInstance.globalData.cloudEnv,
        message: '使用配置的云环境信息',
        SDKVersion: appInstance.globalData.systemInfo.SDKVersion || '未知',
        timestamp: new Date().toLocaleString()
      };
      
      this.setData({
        envCheckResult: JSON.stringify(envResult, null, 2)
      });
      
      console.log('云环境检查结果:', envResult);
      
      // 测试云函数调用，验证环境是否正常
      this.testCloudFunctionEnv();
    } else {
      console.error('云能力不可用');
      const envResult = {
        error: '云能力不可用',
        message: '请使用 2.2.3 或以上的基础库',
        timestamp: new Date().toLocaleString()
      };
      this.setData({
        envCheckResult: JSON.stringify(envResult, null, 2)
      });
    }
  },

  // 测试getOrderStats云函数
  testGetOrderStats: async function() {
    try {
      this.setData({
        orderStatsResult: '正在调用...'
      });
      
      const result = await wx.cloud.callFunction({
        name: 'getOrderStats'
      });
      
      this.setData({
        orderStatsResult: JSON.stringify(result.result, null, 2)
      });
    } catch (error) {
      this.setData({
        orderStatsResult: '调用失败: ' + error.message
      });
      console.error('调用getOrderStats失败:', error);
    }
  },

  // 测试user-get云函数
  testUserGetProfile: async function() {
    try {
      this.setData({
        userProfileResult: '正在调用...'
      });
      
      const result = await wx.cloud.callFunction({
        name: 'user-get'
      });
      
      this.setData({
        userProfileResult: JSON.stringify(result.result, null, 2)
      });
    } catch (error) {
      this.setData({
        userProfileResult: '调用失败: ' + error.message
      });
      console.error('调用user-get失败:', error);
    }
  },

  // 获取本地用户信息
  getLocalUserInfo: function() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      const token = wx.getStorageSync('token');
      
      const result = {
        hasUserInfo: !!userInfo,
        hasToken: !!token,
        userInfo: userInfo,
        token: token
      };
      
      this.setData({
        localUserInfoResult: JSON.stringify(result, null, 2)
      });
    } catch (error) {
      this.setData({
        localUserInfoResult: '获取失败: ' + error.message
      });
      console.error('获取本地用户信息失败:', error);
    }
  },

  // 测试云函数调用，验证环境
  testCloudFunctionEnv: async function() {
    console.log('开始测试云函数调用环境...');
    
    try {
      this.setData({
        cloudFunctionTestResult: '正在调用云函数...'
      });
      
      // 使用util-get-openid获取openid，验证环境
      const result = await wx.cloud.callFunction({
        name: 'util-get-openid',
        data: {}
      });
      
      console.log('云函数调用结果:', result);
      
      // 检查返回结果
      const testResult = {
        success: true,
        result: result,
        message: '云函数调用成功',
        timestamp: new Date().toLocaleString()
      };
      
      this.setData({
        cloudFunctionTestResult: JSON.stringify(testResult, null, 2)
      });
      
    } catch (error) {
      console.error('云函数调用失败:', error);
      const testResult = {
        success: false,
        error: error.message,
        message: '云函数调用失败',
        timestamp: new Date().toLocaleString()
      };
      this.setData({
        cloudFunctionTestResult: JSON.stringify(testResult, null, 2)
      });
    }
  }
});