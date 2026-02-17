// 登录页 JS
Page({
  data: {
    userInfo: {},
    editInfo: {
      nickname: '',
      gender: 0, // 0:未知, 1:男, 2:女
      phoneNumber: '' // ✅ 删除birthday和region字段
    },
    currentDate: ''
    // ✅ 删除所有生日和地区选择器相关数据
  },

  onLoad() {
    // 设置当前日期
    const currentDate = new Date().toISOString().split('T')[0];
    
    // 原有加载逻辑不变
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({
      userInfo: userInfo,
      currentDate: currentDate,
      editInfo: {
        nickname: userInfo.nickname || userInfo.nickName || '',
        gender: userInfo.gender || 0,
        phoneNumber: userInfo.phoneNumber || userInfo.phone || '' // ✅ 删除birthday和region
      }
    });
    
    // ✅ 删除生日和地区选择器初始化
    
    // 等待登录态就绪后，再读取用户信息
    const app = getApp();
    if (app.globalData.loginReady) {
      this.getUserInfoFromDB();
    } else {
      const timer = setInterval(() => {
        if (app.globalData.loginReady) {
          clearInterval(timer);
          this.getUserInfoFromDB();
        }
      }, 500);
    }
  },
  
  // ✅ 删除所有生日和地区选择器相关方法

  // 1. 官方头像选择回调（自动过安全检测，仅返回合法头像）
  onChooseAvatar(e) {
    console.log("[个人信息页-日志] 官方头像选择回调，头像临时路径：", e.detail.avatarUrl);
    // 更新页面显示
    this.setData({
      'userInfo.avatarUrl': e.detail.avatarUrl,
      'editInfo.avatarUrl': e.detail.avatarUrl
    });
    // 保存到本地存储
    const wxUserInfo = wx.getStorageSync('userInfo') || {};
    const updatedWxUserInfo = { ...wxUserInfo, avatarUrl: e.detail.avatarUrl };
    wx.setStorageSync('userInfo', updatedWxUserInfo);
  },



  // 6. 保存用户信息到云数据库 - 添加详细日志
  async saveUserInfoToDB(info) {
    try {
      console.log("[个人信息页-日志] 开始保存用户信息到数据库");
      console.log("[个人信息页-日志] 待保存信息：", info);
      
      // 获取openid，优先从本地存储获取，其次从全局获取
      const localOpenid = wx.getStorageSync('openid');
      const globalOpenid = getApp().globalData.openid;
      const openid = localOpenid || globalOpenid;
      console.log("[个人信息页-日志] 获取到的openid：", openid);
      
      // 检查openid是否存在
      if (!openid) {
        console.error("[个人信息页-日志] 保存失败：openid不存在，localOpenid：", localOpenid, "globalOpenid：", globalOpenid);
        wx.showToast({ title: '登录状态异常，请重新登录', icon: 'error' });
        return;
      }
      
      // ✅ 过滤不合法字段（删除birthday和region）
      const validInfo = {};
      const allowKeys = ['nickname', 'avatarUrl', 'phoneNumber', 'gender'];
      Object.keys(info).forEach(key => {
        if (allowKeys.includes(key)) {
          validInfo[key] = info[key];
        }
      });
      
      // 处理头像：若为临时路径，先上传到云存储
      let finalInfo = { ...validInfo };
      if (validInfo.avatarUrl && validInfo.avatarUrl.startsWith('http://tmp/')) {
        console.log("[个人信息页-日志] 开始上传临时头像到云存储");
        // 生成唯一云存储路径
        const cloudPath = `user-avatars/${openid || new Date().getTime()}-${Math.random().toString(36).substr(2, 10)}.png`;
        // 官方规范的上传方式（filePath传临时路径）
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: validInfo.avatarUrl
        });
        finalInfo.avatarUrl = uploadRes.fileID; // 云存储永久链接
        console.log("[个人信息页-日志] 头像上传成功，fileID：", finalInfo.avatarUrl);
      }
      
      // 准备调用云函数的参数
      const cloudFuncParams = { openid, ...finalInfo };
      console.log("[个人信息页-日志] 调用user-update云函数，参数：", cloudFuncParams);
      
      // 调用云函数
      const res = await wx.cloud.callFunction({
        name: "user-update",
        data: cloudFuncParams
      });
      
      console.log("[个人信息页-日志] user-update云函数调用结果：", res);
      
      // 检查调用结果
      if (res.result.code === 200) {
        console.log("[个人信息页-日志] 用户信息保存成功");
        wx.showToast({ title: '信息保存成功' });
      } else {
        console.error("[个人信息页-日志] 云函数返回错误：", res.result.message || "保存失败");
        wx.showToast({ title: res.result.message || '保存失败', icon: 'error' });
      }
    } catch (err) {
      console.error("[个人信息页-日志] 保存用户信息异常错误：", err);
      console.error("[个人信息页-日志] 错误详情：", JSON.stringify(err, null, 2));
      wx.showToast({ title: '保存失败，请检查网络或重试', icon: 'error' });
      
      // 额外记录错误类型和关键信息
      console.error("[个人信息页-日志] 错误类型：", err.name);
      console.error("[个人信息页-日志] 错误消息：", err.message);
      console.error("[个人信息页-日志] 错误堆栈：", err.stack);
    }
  },

  // ✅ 删除手机号解密组件相关方法
  
  // ✅ 获取微信绑定手机号（授权后自动填充）
  onGetPhoneNumber(e) {
    if (!e.detail.code) {
      wx.showToast({ title: '您已取消手机号授权', icon: 'none' });
      return;
    }
    // 调用云函数解密手机号
    wx.cloud.callFunction({
      name: "user-decode-phone",
      data: { code: e.detail.code },
      success: (res) => {
        const phoneNumber = res.result?.data?.phoneNumber || '';
        if (!phoneNumber) {
          wx.showToast({ title: '手机号解密失败', icon: 'error' });
          return;
        }
        // 更新页面显示
        this.setData({
          'userInfo.phoneNumber': phoneNumber,
          'editInfo.phoneNumber': phoneNumber
        });
        // 保存到本地存储
        const wxUserInfo = wx.getStorageSync('userInfo') || {};
        const updatedWxUserInfo = { ...wxUserInfo, phoneNumber };
        wx.setStorageSync('userInfo', updatedWxUserInfo);
        // 保存到数据库
        this.saveUserInfoToDB({ phoneNumber });
        wx.showToast({ title: '手机号绑定成功' });
      },
      fail: (err) => {
        wx.showToast({ title: '手机号授权失败', icon: 'error' });
        console.error('手机号解密错误:', err);
      }
    });
  },

  // 从云数据库读取用户信息
  async getUserInfoFromDB() {
    try {
      const app = getApp();
      const openid = app.globalData.openid;
      console.log("[个人信息页-日志] 开始读取用户信息，openid：", openid);
      
      if (!openid) {
        console.error("[个人信息页-日志] 读取失败：openid为空！");
        return;
      }

      const res = await wx.cloud.callFunction({
        name: "user-get",
        data: { openid }
      });
      console.log("[个人信息页-日志] 读取用户信息返回：", res);
      if (res.result.code === 200 && res.result.data?.userInfo) {
        this.setData({ userInfo: res.result.data.userInfo });
        console.log("[个人信息页-日志] 读取成功，前端更新userInfo：", this.data.userInfo);
      } else {
        console.log("[个人信息页-日志] 读取失败：数据库无该用户信息");
      }
    } catch (err) {
      console.error('[个人信息页-日志] 读取用户信息异常：', err);
    }
  },
  
  // 返回上一页
  navigateBack() {
    wx.navigateBack({
      delta: 1
    });
  },
  
  // 昵称输入变化（官方type="nickname"自动进行安全监测）
  onNickNameChange(e) {
    console.log('[个人信息页-日志] 昵称输入变化:', e.detail.value);
    this.setData({
      'editInfo.nickname': e.detail.value
    });
  },
  
  // 手机号输入变化
  onPhoneChange(e) {
    this.setData({
      'editInfo.phone': e.detail.value
    });
  },

  // 打开性别选择器
  openGenderPicker() {
    wx.showActionSheet({
      itemList: ['男', '女', '未知'],
      success: (res) => {
        let gender = 0;
        if (res.tapIndex === 0) gender = 1;
        if (res.tapIndex === 1) gender = 2;
        
        this.setData({
          'editInfo.gender': gender
        });
      }
    });
  },
  
  // ✅ 删除所有生日和地区选择器打开/关闭/确认方法
  
  // 新增：保存并登录
  saveAndLogin() {
    console.log("[登录页-日志] 点击保存并登录按钮，开始保存用户信息");
    console.log("[登录页-日志] 当前editInfo：", this.data.editInfo);
    console.log("[登录页-日志] 当前userInfo：", this.data.userInfo);
    
    // 验证必填项
    if (!this.data.editInfo.nickname.trim()) {
      console.error("[登录页-日志] 保存失败：昵称不能为空");
      wx.showToast({
        title: '请输入昵称',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    if (!this.data.editInfo.phoneNumber) {
      console.error("[登录页-日志] 保存失败：手机号不能为空");
      wx.showToast({
        title: '请输入手机号',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 准备最终保存的用户信息
    const updatedUserInfo = {
      ...this.data.userInfo,
      ...this.data.editInfo
    };
    console.log("[登录页-日志] 最终准备保存的完整用户信息：", updatedUserInfo);
    
    try {
      // 保存到本地存储
      console.log("[登录页-日志] 开始保存到本地存储");
      wx.setStorageSync('userInfo', updatedUserInfo);
      console.log("[登录页-日志] 本地存储保存成功");
      
      // 保存到云数据库
      console.log("[登录页-日志] 开始保存到云数据库");
      // 调用saveUserInfoToDB保存到云数据库
      this.saveUserInfoToDB(updatedUserInfo).then(() => {
        console.log("[登录页-日志] 云数据库保存成功");
        
        // 维护登录态
        const app = getApp();
        if (app.globalData) {
          app.globalData.openid = wx.getStorageSync('openid') || app.globalData.openid;
          app.globalData.userInfo = updatedUserInfo;
          app.globalData.loginReady = true;
        }
        
        // 保存token
        const token = 'token_' + (wx.getStorageSync('openid') || Date.now()) + '_' + Date.now();
        wx.setStorageSync('token', token);
        
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 2000,
          success: () => {
            // 登录成功后跳转回之前的页面或"我的"页面
            setTimeout(() => {
              console.log("[登录页-日志] 登录全部成功，跳转至我的页面");
              wx.switchTab({ url: '/pages/user/center/center' });
            }, 1500);
          }
        });
      }).catch(error => {
        console.error("[登录页-日志] 云数据库保存失败：", error);
        wx.showToast({
          title: '云数据库保存失败，请重试',
          icon: 'error',
          duration: 2000
        });
      });
    } catch (error) {
      console.error("[登录页-日志] 保存信息失败，本地存储异常：", error);
      console.error("[登录页-日志] 错误详情：", JSON.stringify(error, null, 2));
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  }
});