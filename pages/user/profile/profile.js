// 登录页 JS
Page({
  data: {
    userInfo: {}, // 原始用户信息
    editInfo: {}, // 编辑中的用户信息
    isLogin: false, // 登录状态
  },

  // 页面加载
  onLoad() {
    // 获取本地存储的用户信息（解密）
    let wxUserInfo = {};
    try {
      const encryptedUserInfo = wx.getStorageSync('userInfo');
      if (encryptedUserInfo) {
        wxUserInfo = JSON.parse(decodeURIComponent(encryptedUserInfo));
      }
    } catch (error) {
      console.error('读取用户信息失败:', error);
    }
    
    // 获取手机号（从 userPhone 中）
    const userPhone = wx.getStorageSync('userPhone') || '';
    console.log('获取到的手机号:', userPhone);
    
    const app = getApp();
    const appUserInfo = app.globalData.userInfo || {};
    
    // 合并用户信息（优先级：本地存储 > 全局数据）
    const userInfo = { ...appUserInfo, ...wxUserInfo };
    
    // 检查登录状态
    const isLogin = app.globalData.isLogin || !!(wxUserInfo.nickName || wxUserInfo.phoneNumber || userPhone);
    
    // 初始化编辑信息
    this.setData({
      userInfo: userInfo,
      editInfo: {
        nickname: userInfo.nickName || '',
        phoneNumber: userPhone || userInfo.phoneNumber || '',
        avatarUrl: userInfo.avatarUrl || ''
      },
      isLogin: isLogin
    });
    console.log('初始化编辑信息:', this.data.editInfo);
  },

  // 头像选择
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({
      'editInfo.avatarUrl': avatarUrl
    });
  },

  // 昵称输入变化
  onNickNameChange(e) {
    this.setData({
      'editInfo.nickname': e.detail.value
    });
  },

  // 保存用户信息到数据库
  async saveUserInfoToDB(updates) {
    try {
      const db = wx.cloud.database();
      const collection = db.collection('shop_user');
      
      // 获取用户 openid
      const app = getApp();
      const openid = app.globalData.openid || (await this.getOpenid());
      
      if (!openid) {
        throw new Error('无法获取用户 openid');
      }
      
      // 查找或创建用户记录
      const userRecord = await collection.where({ openid }).get();
      
      if (userRecord.data.length > 0) {
        // 更新现有记录
        await collection.doc(userRecord.data[0]._id).update({
          data: updates
        });
      } else {
        // 创建新记录
        await collection.add({
          data: {
            openid,
            ...updates,
            createdAt: db.serverDate(),
            updatedAt: db.serverDate()
          }
        });
      }
      
      return true;
    } catch (error) {
      console.error('保存用户信息到数据库失败:', error);
      return false;
    }
  },

  // 获取用户 openid
  async getOpenid() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'login'
      });
      return res.result?.openid || '';
    } catch (error) {
      console.error('获取 openid 失败:', error);
      return '';
    }
  },

  // 保存并登录
  async saveAndLogin() {
    const { editInfo } = this.data;
    
    // 验证必填项
    if (!editInfo.nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    
    if (!editInfo.phoneNumber) {
      wx.showToast({ title: '请获取手机号', icon: 'none' });
      return;
    }
    
    // 显示加载提示
    wx.showLoading({ title: '保存中...' });
    
    try {
      // 准备要保存的数据
      const userData = {
        nickName: editInfo.nickname,
        phoneNumber: editInfo.phoneNumber,
        avatarUrl: editInfo.avatarUrl || '',
        updatedAt: new Date()
      };
      console.log('准备保存的数据:', userData);
      
      // 保存到本地存储（加密）
      wx.setStorageSync('userInfo', encodeURIComponent(JSON.stringify(userData)));
      console.log('已保存到本地存储');
      
      // 保存到全局数据
      const app = getApp();
      app.globalData.userInfo = userData;
      console.log('已更新全局数据');
      
      // 确保 token 和 openid 也被保存（加密）
      const token = app.globalData.token || wx.getStorageSync('token');
      const openid = app.globalData.openid || wx.getStorageSync('openid');
      
      if (token) {
        wx.setStorageSync('token', encodeURIComponent(token));
      }
      
      if (openid) {
        wx.setStorageSync('openid', encodeURIComponent(openid));
      }
      
      // 更新全局登录状态
      app.globalData.isLogin = true;
      
      // 保存到数据库
      const saveResult = await this.saveUserInfoToDB(userData);
      console.log('数据库保存结果:', saveResult);
      
      if (saveResult) {
        wx.showToast({ title: '保存成功' });
        // 跳转到个人中心页面，让用户立即看到修改后的信息
        wx.switchTab({ 
          url: '/pages/user/center/center',
          success: function() {
            console.log('跳转到个人中心成功');
          },
          fail: function(error) {
            console.error('跳转到个人中心失败:', error);
          }
        });
      } else {
        wx.showToast({ title: '保存失败，请重试', icon: 'error' });
      }
    } catch (error) {
      console.error('保存失败:', error);
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  // 返回上一页
  navigateBack() {
    wx.navigateBack();
  },

  // 保存用户信息
  async saveUserInfo() {
    const { editInfo } = this.data;
    
    // 验证必填项
    if (!editInfo.nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    
    // 显示加载提示
    wx.showLoading({ title: '保存中...' });
    
    try {
      // 准备要保存的数据
      const userData = {
        nickName: editInfo.nickname,
        phoneNumber: editInfo.phoneNumber || '',
        avatarUrl: editInfo.avatarUrl || '',
        updatedAt: new Date()
      };
      console.log('准备保存的数据:', userData);
      
      // 保存到本地存储（加密）
      wx.setStorageSync('userInfo', encodeURIComponent(JSON.stringify(userData)));
      console.log('已保存到本地存储');
      
      // 保存到全局数据
      const app = getApp();
      app.globalData.userInfo = userData;
      console.log('已更新全局数据');
      
      // 确保 token 和 openid 也被保存（加密）
      const token = app.globalData.token || wx.getStorageSync('token');
      const openid = app.globalData.openid || wx.getStorageSync('openid');
      
      if (token) {
        wx.setStorageSync('token', encodeURIComponent(token));
      }
      
      if (openid) {
        wx.setStorageSync('openid', encodeURIComponent(openid));
      }
      
      // 更新全局登录状态
      app.globalData.isLogin = true;
      
      // 保存到数据库
      const saveResult = await this.saveUserInfoToDB(userData);
      console.log('数据库保存结果:', saveResult);
      
      if (saveResult) {
        wx.showToast({ title: '保存成功' });
        // 跳转到个人中心页面，让用户立即看到修改后的信息
        wx.switchTab({ 
          url: '/pages/user/center/center',
          success: function() {
            console.log('跳转到个人中心成功');
          },
          fail: function(error) {
            console.error('跳转到个人中心失败:', error);
          }
        });
      } else {
        wx.showToast({ title: '保存失败，请重试', icon: 'error' });
      }
    } catch (error) {
      console.error('保存失败:', error);
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          console.log('用户确认退出登录');
          // 清除本地存储的用户信息
          wx.clearStorageSync();
          console.log('本地存储已清除');
          
          // 清除全局数据中的用户信息
          const app = getApp();
          app.globalData.isLogin = false;
          app.globalData.userInfo = null;
          app.globalData.openid = '';
          app.globalData.token = '';
          console.log('全局数据已清除');
          
          // 跳转到登录页面
          wx.navigateTo({
            url: '/pages/login/auth/auth'
          });
          console.log('已跳转到登录页面');
        } else {
          console.log('用户取消退出登录');
        }
      }
    });
  },
});