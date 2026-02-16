// app.js - 微信小程序入口文件
// 导入环境配置
const { config } = require('./config/env');
// 导入全局加载控制
const loading = require('./utils/loading');

App({
  // 全局数据对象，可以在多个页面间共享
  globalData: {
    userInfo: null,           // 用户信息
    isLogin: false,           // 登录状态
    openid: "", // 存储全局openid
    loginReady: false,        // 标记登录态是否就绪
    cloudEnv: config.CLOUD_ENV_ID,    // 云环境ID（从环境配置获取）
    baseUrl: config.API_BASE_URL,     // 基础API地址
    version: '1.0.1',         // 应用版本号（升级版本）
    currentPage: '',          // 当前页面路径
    systemInfo: {},           // 系统信息（初始化空对象）
    cloudEnvInfo: null        // 云环境详细信息
  },

  /**
   * 小程序初始化时执行
   * 初始化云开发环境、获取系统信息等
   */
  onLaunch: function() {
    console.log('小程序启动中...');
    
    // 1. 检查基础库版本
    const systemInfo = wx.getSystemInfoSync();
    const SDKVersion = systemInfo.SDKVersion;
    console.log('当前基础库版本:', SDKVersion);
    
    // 版本号比较函数
    function compareVersion(v1, v2) {
      v1 = v1.split('.');
      v2 = v2.split('.');
      const len = Math.max(v1.length, v2.length);
      
      for (let i = 0; i < len; i++) {
        const num1 = parseInt(v1[i]) || 0;
        const num2 = parseInt(v2[i]) || 0;
        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
      }
      return 0;
    }
    
    // 检查是否支持云能力
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      // 初始化云环境（使用配置的环境ID）
      wx.cloud.init({
        env: this.globalData.cloudEnv,
        traceUser: false // 关闭用户追踪，符合模板要求
      });
      
      // 添加环境验证日志
      console.log('云环境初始化完成，使用配置的环境ID:', this.globalData.cloudEnv);
      
      // 移除对wx.cloud.getEnv的依赖，避免版本兼容性问题
      // 直接使用配置的环境ID
      this.globalData.cloudEnvInfo = {
        env: this.globalData.cloudEnv,
        message: '使用配置的云环境信息',
        SDKVersion: SDKVersion
      };
      console.log('云环境信息:', this.globalData.cloudEnvInfo);
    }

    // 2. 获取系统信息（使用新的API组合）
    try {
      const deviceInfo = wx.getDeviceInfo();
      const windowInfo = wx.getWindowInfo();
      const appBaseInfo = wx.getAppBaseInfo();
      
      // 合并系统信息（保持原有结构兼容）
      const systemInfo = {
        ...deviceInfo,
        ...windowInfo,
        ...appBaseInfo
      };
      
      this.globalData.systemInfo = systemInfo;
      console.log('系统信息:', systemInfo);
    } catch (e) {
      console.error('获取系统信息失败:', e);
    }

    // 3. 等待登录态获取完成后，再执行后续逻辑
    this.getWXContext().then(() => {
      this.globalData.loginReady = true;
      console.log("[App-日志] 登录态已完全就绪，openid：", this.globalData.openid);
      
      // 4. 检查登录状态（包含token验证）
      this.checkLoginStatus();

      // 5. 获取云开发环境信息（恢复功能）
      this.getCloudEnvInfo();
    });
  },

  /**
   * 小程序显示时执行
   */
  onShow: function(options) {
    console.log('小程序显示，场景值:', options.scene);
    try {
      const pages = getCurrentPages();
      if (pages.length > 0) {
        const currentPage = pages[pages.length - 1];
        const currentRoute = currentPage.route;
        console.log('当前页面:', currentRoute);
        this.globalData.currentPage = currentRoute;
      }
    } catch (error) {
      console.error('获取当前页面失败:', error);
      this.globalData.currentPage = '';
    }
  },

  /**
   * 小程序隐藏时执行
   */
  onHide: function() {
    console.log('小程序隐藏');
  },

  /**
   * 小程序发生错误时执行
   */
  onError: function(error) {
    console.error('小程序错误:', error);
    this.reportError(error);
  },

  /**
   * 页面不存在时执行
   */
  onPageNotFound: function(options) {
    console.log('页面不存在:', options.path);
    // 直接跳转到首页
    wx.redirectTo({
      url: '/pages/index/index'
    });
  },

  /**
   * 检查登录状态（简化版，移除云函数验证）
   */
  checkLoginStatus: function() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      const token = wx.getStorageSync('token');
      
      if (userInfo && token) {
        this.globalData.userInfo = userInfo;
        this.globalData.isLogin = true;
        console.log('登录状态有效');
      } else {
        console.log('未登录或登录状态已过期');
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
    }
  },

  /**
   * 封装登录态获取方法（返回Promise）
   */
  async getWXContext(retryCount = 0) { // 添加重试计数器
    const MAX_RETRIES = 2; // 定义最大重试次数
    try {
      // 改造第一步：先调用 wx.login 获取登录凭证 code
      console.log(`[App-日志] 调用 wx.login() 获取 code... (尝试第 ${retryCount + 1} 次)`);
      const loginRes = await wx.login();
      if (!loginRes.code) {
        throw new Error("wx.login() 调用失败，未能获取到 code");
      }
      console.log("[App-日志] 获取 code 成功: ", loginRes.code);

      // 改造第二步：调用新的、零依赖的云函数
      const res = await wx.cloud.callFunction({
        name: 'get-openid-new',
        data: {
          code: loginRes.code
        }
      });

      // 检查返回结果，确保云函数执行成功
      if (res.result.errCode !== 0) {
        throw new Error(`云函数执行失败: ${res.result.errMsg}`);
      }

      // 检查返回结果，获取openid
      const openid = res.result?.data?.openid;
      if (openid) {
        this.globalData.openid = openid;
        this.globalData.isLogin = true;
        console.log('获取到的openid：', openid);
        return Promise.resolve(); // 成功获取，结束函数
      } else {
        throw new Error("云函数返回结果中没有 openid");
      }
    } catch (err) {
      console.error(`[App-日志] 获取openid失败 (第 ${retryCount + 1} 次):`, err);
      if (retryCount < MAX_RETRIES) {
        // 如果未达到最大重试次数，等待1秒后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.getWXContext(retryCount + 1); // 传入增加后的计数器
      } else {
        console.error("[App-日志] 获取openid失败：已达到最大重试次数，停止重试。");
        wx.showToast({
          title: '网络开小差了，请稍后重试',
          icon: 'none'
        });
        return Promise.reject(err); // 达到最大次数，返回失败
      }
    }
  },

  /**
   * 获取云开发环境信息（简化版，移除云函数调用）
   */
  getCloudEnvInfo: function() {
    try {
      // 使用默认配置的云环境信息，不调用云函数
      this.globalData.cloudEnvInfo = {
        env: this.globalData.cloudEnv,
        message: '使用本地配置的云环境信息'
      };
      console.log('云环境信息获取成功:', this.globalData.cloudEnvInfo);
    } catch (error) {
      console.error('获取云环境信息失败:', error);
      this.globalData.cloudEnvInfo = { error: '获取失败' };
    }
  },

  /**
   * 上报错误信息（增加本地备份）
   */
  reportError: async function(error) {
    try {
      // 检查是否支持云函数调用
      if (wx.cloud && wx.cloud.callFunction) {
        const cloudFunctionName = 'reportError';
        // 关键修改点1：增加调用日志，打印函数名便于排查
        console.log('调用云函数上报错误，函数名：', cloudFunctionName);
        
        await wx.cloud.callFunction({
          // 关键修改点2：确保函数名与云端完全一致（区分大小写）
          name: cloudFunctionName,
          data: {
            error: String(error),
            path: this.globalData.currentPage || 'unknown',
            timestamp: new Date().getTime(),
            version: this.globalData.version  // 增加版本信息
          },
          // 关键修改点3：添加fail回调作为兜底，避免影响主流程
          fail: (err) => {
            console.warn('错误上报云函数调用失败（函数不存在/部署异常）：', err);
            // 额外兜底：打印详细错误信息，便于开发人员定位问题
            if (err.errMsg.includes('FunctionName parameter could not be found')) {
              console.error('云函数调用错误原因：函数名不存在或拼写错误，请检查云端是否已正确部署reportError函数');
            }
          }
        });
      } else {
        console.error('云函数调用不支持，直接备份到本地');
        throw new Error('云函数调用不支持');
      }
    } catch (reportError) {
      console.error('上报错误失败，已备份到本地:', reportError);
      // 本地存储备份
      try {
        const errorLogs = wx.getStorageSync('errorLogs') || [];
        errorLogs.push({
          error: String(error),
          path: this.globalData.currentPage || 'unknown',
          timestamp: new Date().getTime(),
          version: this.globalData.version,
          reportFailed: true,
          // 增加失败原因，便于后续分析
          failureReason: String(reportError)
        });
        // 限制日志数量（最多100条）
        if (errorLogs.length > 100) errorLogs.shift();
        wx.setStorageSync('errorLogs', errorLogs);
      } catch (storageError) {
        console.error('本地存储备份失败:', storageError);
        // 最终兜底：确保不会影响主流程，仅打印日志
      }
    }
  }
});