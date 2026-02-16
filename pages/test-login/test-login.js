// 微信登录测试页面
const auth = require('../../utils/auth');

Page({
  data: {
    loginStatus: '未登录',
    log: []
  },

  onLoad: function (options) {
    this.addLog('页面加载完成');
    this.checkLoginStatus();
  },

  // 添加日志
  addLog: function (message) {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = `${timestamp} - ${message}`;
    this.setData({
      log: [...this.data.log, newLog]
    });
    console.log(newLog);
  },

  // 检查登录状态
  checkLoginStatus: function () {
    this.addLog('开始检查登录状态...');
    
    try {
      const userInfo = wx.getStorageSync('userInfo');
      const token = wx.getStorageSync('token');
      
      if (userInfo && token) {
        this.setData({ loginStatus: '已登录' });
        this.addLog('检测到用户信息和token，当前处于登录状态');
      } else {
        this.setData({ loginStatus: '未登录' });
        this.addLog('未检测到用户信息或token');
      }
    } catch (error) {
      this.addLog('检查登录状态失败: ' + error.message);
    }
  },

  // 微信登录
  wechatLogin: function () {
    this.addLog('开始微信登录流程...');
    
    wx.login({
      success: (res) => {
        if (res.code) {
          this.addLog('获取登录凭证code成功: ' + res.code);
          // 这里可以调用自定义登录云函数
          this.testUserLoginFunction();
        } else {
          this.addLog('登录失败: ' + res.errMsg);
        }
      },
      fail: (err) => {
        this.addLog('wx.login调用失败: ' + err.errMsg);
      }
    });
  },

  // 测试云函数调用
  testCloudFunction: function () {
    this.addLog('测试云函数调用...');
    
    // 这里可以调用任意云函数进行测试
    wx.cloud.callFunction({
      name: 'user-login',
      data: { action: 'test' },
      success: (res) => {
        this.addLog('云函数调用成功: ' + JSON.stringify(res.result));
      },
      fail: (err) => {
        this.addLog('云函数调用失败: ' + err.errMsg);
      }
    });
  },

  // 测试登录云函数
  testUserLoginFunction: function () {
    this.addLog('测试登录云函数...');
    
    auth.login()
      .then(userInfo => {
        this.addLog('登录成功: ' + userInfo.nickName);
        this.setData({ loginStatus: '已登录' });
      })
      .catch(error => {
        this.addLog('登录云函数测试失败: ' + error.message);
      });
  },

  // 清除登录状态
  clearLoginStatus: function () {
    this.addLog('清除登录状态...');
    
    try {
      wx.removeStorageSync('userInfo');
      wx.removeStorageSync('token');
      wx.removeStorageSync('openid');
      this.setData({ loginStatus: '未登录' });
      this.addLog('登录状态已清除');
    } catch (error) {
      this.addLog('清除登录状态失败: ' + error.message);
    }
  },

  // 检查云环境
  checkCloudEnv: function () {
    this.addLog('检查云环境...');
    
    wx.cloud.init({
      env: 'your-env-id',
      traceUser: true
    });
    
    this.addLog('云环境检查完成');
  },

  // 检查登录问题
  checkLoginIssue: function () {
    this.addLog('检查登录问题...');
    // 这里可以调用专门的登录问题检查函数
    wx.cloud.callFunction({
      name: 'checkLoginIssue',
      success: (res) => {
        this.addLog('登录问题检查完成: ' + JSON.stringify(res.result));
      },
      fail: (err) => {
        this.addLog('登录问题检查失败: ' + err.errMsg);
      }
    });
  },

  // 复制日志
  copyLog: function () {
    const logText = this.data.log.join('\n');
    wx.setClipboardData({
      data: logText,
      success: () => {
        wx.showToast({ title: '复制成功' });
      }
    });
  },

  // 清空日志
  clearLog: function () {
    this.setData({ log: [] });
    this.addLog('日志已清空');
  }
});