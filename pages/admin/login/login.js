/**
 * 管理员登录页面逻辑
 */
const { API } = require('../../../config/api');
const request = require('../../../utils/request');
const { STORAGE_KEY } = require('../../../config/constants');
const { debounce } = require('../../../utils/util');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 管理员账号
    username: '',
    // 密码
    password: '',
    // 加载状态
    loading: false,
    // 错误提示信息
    errorMsg: '',
    // 当前年份
    currentYear: new Date().getFullYear()
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 检查是否已登录，如果已登录则跳转到仪表盘
    this.checkLoginStatus();
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus: function () {
    const adminInfo = wx.getStorageSync(STORAGE_KEY.ADMIN_INFO);
    const token = wx.getStorageSync(STORAGE_KEY.ADMIN_TOKEN);
    
    if (adminInfo && token) {
      // 已登录，跳转到仪表盘
      wx.switchTab({
        url: '/pages/admin/dashboard/dashboard'
      });
    }
  },

  /**
   * 输入框内容变化处理
   */
  onInputChange: function (e) {
    const { name, value } = e.detail;
    
    this.setData({
      [name]: value,
      // 清除错误提示
      errorMsg: ''
    });
  },

  /**
   * 表单验证
   * @returns {boolean} 验证结果
   */
  validateForm: function () {
    const { username, password } = this.data;
    
    // 检查账号是否为空
    if (!username.trim()) {
      this.setData({
        errorMsg: '请输入管理员账号'
      });
      return false;
    }
    
    // 检查密码是否为空
    if (!password.trim()) {
      this.setData({
        errorMsg: '请输入密码'
      });
      return false;
    }
    
    // 检查密码长度
    if (password.length < 6) {
      this.setData({
        errorMsg: '密码长度不能少于6位'
      });
      return false;
    }
    
    return true;
  },

  /**
   * 登录提交
   */
  onLogin: function (e) {
    // 表单验证
    if (!this.validateForm()) {
      return;
    }
    
    // 显示加载状态
    this.setData({
      loading: true,
      errorMsg: ''
    });
    
    const { username, password } = this.data;
    
    // 调用登录接口
    request({
      url: API.ADMIN_LOGIN,
      method: 'POST',
      data: {
        username: username,
        password: password
      }
    }).then(res => {
      if (res.code === 0) {
        // 登录成功
        this.handleLoginSuccess(res.data);
      } else {
        // 登录失败
        this.handleLoginError(res.message || '登录失败');
      }
    }).catch(err => {
      console.error('登录请求失败:', err);
      this.handleLoginError('网络错误，请稍后重试');
    }).finally(() => {
      this.setData({
        loading: false
      });
    });
  },

  /**
   * 处理登录成功
   * @param {Object} data - 登录成功返回的数据
   */
  handleLoginSuccess: function (data) {
    // 保存管理员信息到本地缓存
    wx.setStorageSync(STORAGE_KEY.ADMIN_INFO, data.adminInfo);
    // 保存token到本地缓存
    wx.setStorageSync(STORAGE_KEY.ADMIN_TOKEN, data.token);
    
    // 显示登录成功提示
    wx.showToast({
      title: '登录成功',
      icon: 'success',
      duration: 1500
    });
    
    // 跳转到仪表盘页面
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/admin/dashboard/dashboard'
      });
    }, 1500);
  },

  /**
   * 处理登录失败
   * @param {string} message - 错误信息
   */
  handleLoginError: function (message) {
    this.setData({
      errorMsg: message
    });
    
    // 显示错误提示
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 忘记密码处理
   */
  onForgotPassword: function () {
    wx.showModal({
      title: '忘记密码',
      content: '请联系系统管理员重置密码',
      showCancel: false,
      confirmText: '确定'
    });
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    // 隐藏加载状态
    this.setData({
      loading: false
    });
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    // 隐藏加载状态
    this.setData({
      loading: false
    });
  }
});