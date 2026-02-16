// 编辑资料页 JS
Page({
  data: {
    userInfo: {},
    editInfo: {
      nickName: '',
      gender: 0, // 0=未知 1=男 2=女
      birthday: '',
      city: [],
      phone: ''
    }
  },

  onLoad() {
    // 加载本地缓存的用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({
      userInfo: userInfo,
      editInfo: {
        nickName: userInfo.nickName || '',
        gender: userInfo.gender || 0,
        birthday: userInfo.birthday || '',
        city: userInfo.city || [],
        phone: userInfo.phone || ''
      }
    });
  },

  // 返回上一页
  navigateBack() {
    wx.navigateBack({
      delta: 1
    });
  },

  // 选择/获取微信头像
  chooseAvatar() {
    try {
      // 先读取本地缓存的微信用户信息
      const wxUserInfo = wx.getStorageSync('userInfo') || {};
      if (wxUserInfo.avatarUrl) {
        this.setData({
          'userInfo.avatarUrl': wxUserInfo.avatarUrl,
          'editInfo.avatarUrl': wxUserInfo.avatarUrl
        });
        wx.showToast({
          title: '已获取微信头像',
          icon: 'success',
          duration: 1500
        });
        return;
      }

      // 未获取过则引导授权
      wx.getUserProfile({
        desc: '用于完善个人资料的头像展示',
        success: (res) => {
          const avatarUrl = res.userInfo.avatarUrl;
          this.setData({
            'userInfo.avatarUrl': avatarUrl,
            'editInfo.avatarUrl': avatarUrl
          });
          // 更新本地缓存
          wx.setStorageSync('userInfo', { ...wxUserInfo, avatarUrl });
          wx.showToast({
            title: '已获取微信头像',
            icon: 'success',
            duration: 1500
          });
        },
        fail: () => {
          wx.showToast({
            title: '你拒绝了授权',
            icon: 'none',
            duration: 2000
          });
        }
      });
    } catch (err) {
      console.error('获取头像失败:', err);
      wx.showToast({
        title: '获取头像失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 昵称输入变化
  onNickNameChange(e) {
    this.setData({
      'editInfo.nickName': e.detail.value
    });
  },

  // 打开性别选择器（标准API）
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

  // 打开生日选择器（标准API）
  openBirthdayPicker() {
    const currentDate = this.data.editInfo.birthday || '1990-01-01';
    const [year, month, day] = currentDate.split('-').map(Number);
    wx.showDatePicker({
      year: year,
      month: month - 1, // 小程序month是0-11
      day: day,
      success: (res) => {
        this.setData({
          'editInfo.birthday': `${res.year}-${res.month + 1}-${res.day}`
        });
      }
    });
  },

  // 打开城市选择器（标准API）
  openCityPicker() {
    wx.chooseLocation({
      success: (res) => {
        // 解析省市区
        const province = res.province || '';
        const city = res.city || '';
        const district = res.district || '';
        this.setData({
          'editInfo.city': [province, city, district].filter(Boolean)
        });
      },
      fail: (err) => {
        if (err.errMsg.includes('auth deny')) {
          wx.showToast({
            title: '请开启定位权限',
            icon: 'none'
          });
        }
      }
    });
  },

  // 手机号输入变化
  onPhoneChange(e) {
    this.setData({
      'editInfo.phone': e.detail.value
    });
  },

  // 保存用户信息
  saveUserInfo() {
    const { editInfo } = this.data;
    
    // 基础校验
    if (!editInfo.nickName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    // 整合信息并保存到本地缓存
    const updatedUserInfo = { ...this.data.userInfo, ...editInfo };
    wx.setStorageSync('userInfo', updatedUserInfo);

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });

    // 保存后返回上一页
    setTimeout(() => {
      this.navigateBack();
    }, 1500);
  }
});