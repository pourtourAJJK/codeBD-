// pages/user/info/info.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 存储个人信息（实际项目可从接口获取）
    userInfo: {
      avatar: "",
      nickname: "",
      gender: "女",
      birthday: "",
      province: "",
      city: "",
      district: "",
      phone: "15089728216",
      wechat: "微信用户"
    },
    // 当前日期
    currentDate: "",
    // 生日选择器
    showBirthdayPicker: false,
    // 生日选择器数据
    birthdayPicker: {
      years: [],
      months: [],
      days: [],
      // 当前选中的索引
      yearIndex: 0,
      monthIndex: 0,
      dayIndex: 0
    },
    // 地区选择器
    showRegionPicker: false,
    // 地区数据（省份、城市、区县三级联动）
    regionData: {
      provinces: [
        { name: '北京', cities: [
          { name: '北京', districts: ['东城区', '西城区', '朝阳区', '丰台区', '石景山区', '海淀区', '门头沟区', '房山区', '通州区', '顺义区', '昌平区', '大兴区', '怀柔区', '平谷区', '密云区', '延庆区'] }
        ] },
        { name: '上海', cities: [
          { name: '上海', districts: ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '闵行区', '宝山区', '嘉定区', '浦东新区', '金山区', '松江区', '青浦区', '奉贤区', '崇明区'] }
        ] },
        { name: '广东', cities: [
          { name: '广州', districts: ['越秀区', '海珠区', '荔湾区', '天河区', '白云区', '黄埔区', '番禺区', '花都区', '南沙区', '从化区', '增城区'] },
          { name: '深圳', districts: ['罗湖区', '福田区', '南山区', '宝安区', '龙岗区', '盐田区', '龙华区', '坪山区', '光明区', '大鹏新区'] },
          { name: '珠海', districts: ['香洲区', '斗门区', '金湾区'] },
          { name: '汕头', districts: ['龙湖区', '金平区', '濠江区', '潮阳区', '潮南区', '澄海区', '南澳县'] }
        ] },
        { name: '江苏', cities: [
          { name: '南京', districts: ['玄武区', '秦淮区', '建邺区', '鼓楼区', '浦口区', '栖霞区', '雨花台区', '江宁区', '六合区', '溧水区', '高淳区'] },
          { name: '苏州', districts: ['姑苏区', '虎丘区', '吴中区', '相城区', '吴江区', '苏州工业园区', '常熟市', '张家港市', '昆山市', '太仓市'] }
        ] },
        { name: '浙江', cities: [
          { name: '杭州', districts: ['上城区', '下城区', '江干区', '拱墅区', '西湖区', '滨江区', '萧山区', '余杭区', '富阳区', '临安区', '桐庐县', '淳安县', '建德市'] },
          { name: '宁波', districts: ['海曙区', '江北区', '北仑区', '镇海区', '鄞州区', '奉化区', '象山县', '宁海县', '余姚市', '慈溪市'] }
        ] }
      ],
      // 当前选中的省份、城市、区县索引
      provinceIndex: 0,
      cityIndex: 0,
      districtIndex: 0
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 设置当前日期
    const currentDate = new Date().toISOString().split('T')[0];
    
    // 初始化生日选择器数据
    this.initBirthdayPicker();
    
    // 初始化地区选择器数据
    this.initRegionPicker();
    
    // 尝试从本地存储获取用户信息
    const that = this;
    wx.getStorage({
      key: 'userInfo',
      success: (res) => {
        console.log('获取缓存成功:', res.data);
        // 合并存储的用户信息和默认数据
        const userInfo = {
          ...this.data.userInfo,
          ...res.data
        };
        this.setData({
          userInfo: userInfo,
          currentDate: currentDate
        });
      },
      fail: (res) => {
        console.log('获取缓存失败:', res);
        // 从本地存储加载用户信息
        const storedUserInfo = wx.getStorageSync('userInfo') || {};
        
        // 合并存储的用户信息和默认数据
        const userInfo = {
          ...this.data.userInfo,
          ...storedUserInfo
        };
        
        this.setData({
          userInfo: userInfo,
          currentDate: currentDate
        });
      }
    });
  },
  
  /**
   * 初始化地区选择器数据
   */
  initRegionPicker() {
    // 如果有已设置的地区，尝试查找对应的索引
    const { userInfo, regionData } = this.data;
    let provinceIndex = 0;
    let cityIndex = 0;
    let districtIndex = 0;
    
    if (userInfo.province) {
      // 查找省份索引
      provinceIndex = regionData.provinces.findIndex(province => province.name === userInfo.province);
      if (provinceIndex !== -1 && userInfo.city) {
        // 查找城市索引
        cityIndex = regionData.provinces[provinceIndex].cities.findIndex(city => city.name === userInfo.city);
        if (cityIndex !== -1 && userInfo.district) {
          // 查找区县索引
          districtIndex = regionData.provinces[provinceIndex].cities[cityIndex].districts.findIndex(district => district === userInfo.district);
        }
      }
    }
    
    this.setData({
      'regionData.provinceIndex': provinceIndex,
      'regionData.cityIndex': cityIndex,
      'regionData.districtIndex': districtIndex
    });
  },
  
  /**
   * 初始化生日选择器数据
   */
  initBirthdayPicker() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    
    // 生成年份数组（1950年到当前年份）
    const years = [];
    for (let year = 1950; year <= currentYear; year++) {
      years.push(year);
    }
    
    // 生成月份数组
    const months = [];
    for (let month = 1; month <= 12; month++) {
      months.push(month);
    }
    
    // 生成日期数组（根据当前年份和月份）
    const days = this.generateDays(currentYear, currentMonth);
    
    // 设置默认选中的索引
    let yearIndex = 0;
    let monthIndex = currentMonth - 1;
    let dayIndex = currentDay - 1;
    
    // 如果有已设置的生日，更新默认选中索引
    if (this.data.userInfo.birthday) {
      const [year, month, day] = this.data.userInfo.birthday.split('-').map(Number);
      yearIndex = years.indexOf(year);
      monthIndex = month - 1;
      dayIndex = this.generateDays(year, month).indexOf(day);
    }
    
    this.setData({
      'birthdayPicker.years': years,
      'birthdayPicker.months': months,
      'birthdayPicker.days': days,
      'birthdayPicker.yearIndex': yearIndex,
      'birthdayPicker.monthIndex': monthIndex,
      'birthdayPicker.dayIndex': dayIndex
    });
  },
  
  /**
   * 根据年份和月份生成日期数组
   */
  generateDays(year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  },
  
  /**
   * 处理选择器滚动事件
   */
  onPickerChange(e) {
    const { value } = e.detail;
    // 检查 value 是否为有效数组
    if (!value || !Array.isArray(value) || value.length < 3) {
      return;
    }
    
    // value 是一个数组，格式为 [yearIndex, monthIndex, dayIndex]
    const yearIndex = value[0];
    const monthIndex = value[1];
    const dayIndex = value[2];
    
    // 检查索引是否为有效数值
    if (yearIndex === undefined || monthIndex === undefined || dayIndex === undefined) {
      return;
    }
    
    // 获取当前选择的年份和月份
    const { years, months } = this.data.birthdayPicker;
    const year = years[yearIndex];
    const month = months[monthIndex];
    
    // 检查年份和月份是否有效
    if (!year || !month) {
      return;
    }
    
    // 生成新的日期数组（如果年份或月份变化）
    const days = this.generateDays(year, month);
    
    // 更新数据
    this.setData({
      'birthdayPicker.yearIndex': yearIndex,
      'birthdayPicker.monthIndex': monthIndex,
      'birthdayPicker.dayIndex': Math.min(dayIndex, days.length - 1),
      'birthdayPicker.days': days
    });
  },

  // 返回上一页（“我的”页面）
  navigateBack() {
    wx.navigateBack({
      delta: 1
    });
  },

  // 编辑信息
  editInfo(e) {
    // 获取当前点击的信息项
    const label = e.currentTarget.dataset.label;
    console.log('编辑信息:', label);
    
    switch(label) {
      case '性别':
        this.editGender();
        break;
      case '生日':
        this.editBirthday();
        break;
      case '所在城市':
        this.editCity();
        break;
      case '昵称':
        // 昵称现在直接在输入框中编辑，不再需要单独的编辑页面
        break;
      default:
        wx.showToast({
          title: '该功能暂未实现',
          icon: 'none',
          duration: 2000
        });
    }
  },
  
  // 头像点击事件 - 显示操作菜单
  onAvatarTap() {
    console.log('头像被点击了');
    wx.showActionSheet({
      itemList: ['同步微信头像', '上传本地头像'],
      success: (res) => {
        console.log('操作菜单选择结果:', res);
        if (res.tapIndex === 0) {
          // 同步微信头像
          this.syncWechatAvatar();
        } else if (res.tapIndex === 1) {
          // 上传本地头像
          this.chooseLocalAvatar();
        }
      },
      fail: (error) => {
        console.error('显示操作菜单失败:', error);
        // 显示操作菜单失败时，尝试直接调用同步微信头像
        this.syncWechatAvatar();
      }
    });
  },
  
  // 同步微信信息（头像和昵称）
  onSyncWechatInfo() {
    console.log('点击了同步微信信息按钮');
    this.getUserProfile();
  },
  
  // 仅同步微信头像
  syncWechatAvatar() {
    console.log('开始同步微信头像');
    this.getUserProfile();
  },
  
  // 统一获取用户信息的方法
  getUserProfile() {
    console.log('开始获取用户信息');
    
    // 检查是否支持wx.getUserProfile
    if (wx.getUserProfile) {
      wx.getUserProfile({
        desc: '用于完善个人资料',
        success: (res) => {
          console.log('获取微信信息成功:', res);
          const { userInfo } = res;
          
          // 更新用户信息
          this.setData({
            'userInfo.avatar': userInfo.avatarUrl,
            'userInfo.nickname': userInfo.nickName
          });
          
          // 保存到本地存储
          this.saveUserInfo();
          
          // 调用云函数保存用户信息
          this.callSaveUserInfoCloudFunction(userInfo);
          
          wx.showToast({
            title: '已同步微信信息',
            icon: 'success',
            duration: 2000
          });
        },
        fail: (error) => {
          console.error('获取微信信息失败:', error);
          wx.showToast({
            title: '获取微信信息失败',
            icon: 'none',
            duration: 2000
          });
        }
      });
    } else {
      // 使用wx.getUserProfile获取用户信息（推荐方式）
      console.log('使用wx.getUserProfile获取用户信息');
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          console.log('使用wx.getUserProfile获取成功:', res);
          const { userInfo } = res;
          
          // 更新用户信息
          this.setData({
            'userInfo.avatar': userInfo.avatarUrl,
            'userInfo.nickname': userInfo.nickName
          });
          
          // 保存到本地存储
          this.saveUserInfo();
          
          // 调用云函数保存用户信息
          this.callSaveUserInfoCloudFunction(userInfo);
          
          wx.showToast({
            title: '已同步微信信息',
            icon: 'success',
            duration: 2000
          });
        },
        fail: (error) => {
          console.error('使用wx.getUserProfile获取失败:', error);
          wx.showToast({
            title: '获取微信信息失败',
            icon: 'none',
            duration: 2000
          });
        }
      });
    }
  },
  
  // 调用云函数保存用户信息
  callSaveUserInfoCloudFunction(userInfo) {
    console.log('开始调用saveUserInfo云函数:', userInfo);
    
    // 检查是否支持云函数调用
    if (wx.cloud && wx.cloud.callFunction) {
      wx.cloud.callFunction({
        name: 'user-update',
        data: {
          avatarUrl: userInfo.avatarUrl,
          nickName: userInfo.nickName
        },
        success: (res) => {
          console.log('user-update云函数调用成功:', res);
        },
        fail: (error) => {
          console.error('user-update云函数调用失败:', error);
          // 云函数调用失败不影响本地功能
        }
      });
    } else {
      console.error('云函数调用不支持');
    }
  },
  
  // 选择本地头像
  chooseLocalAvatar() {
    console.log('开始选择本地头像');
    
    // 检查是否支持wx.chooseMedia
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
        success: (res) => {
          console.log('选择本地头像成功:', res);
          if (res.tempFiles && res.tempFiles.length > 0) {
            const tempFilePath = res.tempFiles[0].tempFilePath;
            
            // 更新头像
            this.setData({
              'userInfo.avatar': tempFilePath
            });
            
            // 保存到本地存储
            this.saveUserInfo();
            
            wx.showToast({
              title: '头像已更新',
              icon: 'success',
              duration: 2000
            });
          } else {
            console.error('选择头像失败: 没有返回图片文件');
            wx.showToast({
              title: '选择头像失败',
              icon: 'none',
              duration: 2000
            });
          }
        },
        fail: (error) => {
          console.error('选择头像失败:', error);
          wx.showToast({
            title: '选择头像失败',
            icon: 'none',
            duration: 2000
          });
        }
      });
    } else {
      // 兼容旧版本，使用wx.chooseImage
      console.log('使用wx.chooseImage兼容旧版本');
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          console.log('使用wx.chooseImage选择头像成功:', res);
          if (res.tempFilePaths && res.tempFilePaths.length > 0) {
            const tempFilePath = res.tempFilePaths[0];
            
            // 更新头像
            this.setData({
              'userInfo.avatar': tempFilePath
            });
            
            // 保存到本地存储
            this.saveUserInfo();
            
            wx.showToast({
              title: '头像已更新',
              icon: 'success',
              duration: 2000
            });
          }
        },
        fail: (error) => {
          console.error('使用wx.chooseImage选择头像失败:', error);
          wx.showToast({
            title: '选择头像失败',
            icon: 'none',
            duration: 2000
          });
        }
      });
    }
  },
  
  // 昵称输入事件
  onNicknameInput(e) {
    this.setData({
      'userInfo.nickname': e.detail.value
    });
  },
  
  // 昵称输入框获取焦点事件
  onNicknameFocus() {
    // 可以添加一些焦点时的处理逻辑
  },
  
  // 昵称输入框失去焦点事件 - 保存昵称
  onNicknameBlur() {
    this.saveUserInfo();
    wx.showToast({
      title: '昵称已更新',
      icon: 'success',
      duration: 2000
    });
  },
  
  // 保存用户信息到本地存储
  saveUserInfo() {
    const { userInfo } = this.data;
    wx.setStorage({
      key: 'userInfo',
      data: userInfo,
      success: (res) => {
        console.log('保存用户信息成功:', res);
      },
      fail: (error) => {
        console.error('保存用户信息失败:', error);
        // 降级使用同步存储
        wx.setStorageSync('userInfo', userInfo);
      }
    });
  },
  
  // 编辑性别
  editGender() {
    wx.showActionSheet({
      itemList: ['男', '女', '未知'],
      success: (res) => {
        let gender = '未知';
        if(res.tapIndex === 0) gender = '男';
        if(res.tapIndex === 1) gender = '女';
        
        // 更新数据
        this.setData({
          'userInfo.gender': gender
        });
        
        wx.showToast({
          title: '性别已更新',
          icon: 'success',
          duration: 2000
        });
      }
    });
  },
  
  // 编辑生日
  editBirthday() {
    // 显示自定义的生日选择器
    this.setData({
      showBirthdayPicker: true
    });
  },
  
  // 关闭生日选择器
  closeBirthdayPicker() {
    this.setData({
      showBirthdayPicker: false
    });
  },
  
  // 确认选择生日
  confirmBirthday() {
    // 获取选择的年月日
    const { years, months, days, yearIndex, monthIndex, dayIndex } = this.data.birthdayPicker;
    const year = years[yearIndex];
    const month = months[monthIndex];
    const day = days[dayIndex];
    
    // 格式化日期为 YYYY-MM-DD 格式
    const formattedMonth = month.toString().padStart(2, '0');
    const formattedDay = day.toString().padStart(2, '0');
    const birthday = `${year}-${formattedMonth}-${formattedDay}`;
    
    // 更新数据
    this.setData({
      'userInfo.birthday': birthday,
      showBirthdayPicker: false
    });
    
    wx.showToast({
      title: '生日已更新',
      icon: 'success',
      duration: 2000
    });
  },
  
  // 编辑地区
  editCity() {
    // 显示自定义的地区选择器
    this.setData({
      showRegionPicker: true
    });
  },
  
  // 关闭地区选择器
  closeRegionPicker() {
    this.setData({
      showRegionPicker: false
    });
  },
  
  // 确认选择地区
  confirmRegion() {
    // 获取选择的省份、城市、区县
    const { regionData } = this.data;
    const province = regionData.provinces[regionData.provinceIndex].name;
    const city = regionData.provinces[regionData.provinceIndex].cities[regionData.cityIndex].name;
    const district = regionData.provinces[regionData.provinceIndex].cities[regionData.cityIndex].districts[regionData.districtIndex];
    
    // 更新数据
    this.setData({
      'userInfo.province': province,
      'userInfo.city': city,
      'userInfo.district': district,
      showRegionPicker: false
    });
    
    wx.showToast({
      title: '地区已更新',
      icon: 'success',
      duration: 2000
    });
  },
  
  // 地区选择器滚动事件
  onRegionPickerChange(e) {
    const { value } = e.detail;
    const [provinceIndex, cityIndex, districtIndex] = value;
    
    // 获取当前省份和城市数据
    const province = this.data.regionData.provinces[provinceIndex];
    const city = province.cities[cityIndex];
    
    // 确保区县索引不超出范围
    const safeDistrictIndex = Math.min(districtIndex, city.districts.length - 1);
    
    // 更新地区索引
    this.setData({
      'regionData.provinceIndex': provinceIndex,
      'regionData.cityIndex': cityIndex,
      'regionData.districtIndex': safeDistrictIndex
    });
  }
});