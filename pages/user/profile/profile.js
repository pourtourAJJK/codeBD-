// 登录页 JS
Page({
  data: {
    userInfo: {},
    editInfo: {
      nickname: '',
      gender: 0, // 0:未知, 1:男, 2:女
      birthday: '',
      region: '',
      phoneNumber: ''
    },
    currentDate: '',
    // 手机号掩码相关
    phoneMask: '',
    hasPhoneMask: false,
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
        birthday: userInfo.birthday || '',
        region: userInfo.region || '',
        phoneNumber: userInfo.phoneNumber || userInfo.phone || ''
      }
    });
    
    // 初始化生日选择器数据
    this.initBirthdayPicker();
    
    // 初始化地区选择器数据
    this.initRegionPicker();
    
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
  
  /**
   * 初始化地区选择器数据
   */
  initRegionPicker() {
    // 如果有已设置的地区，尝试查找对应的索引
    const { editInfo, regionData } = this.data;
    let provinceIndex = 0;
    let cityIndex = 0;
    let districtIndex = 0;
    
    if (editInfo.province) {
      // 查找省份索引
      provinceIndex = regionData.provinces.findIndex(province => province.name === editInfo.province);
      if (provinceIndex !== -1 && editInfo.city) {
        // 查找城市索引
        cityIndex = regionData.provinces[provinceIndex].cities.findIndex(city => city.name === editInfo.city);
        if (cityIndex !== -1 && editInfo.district) {
          // 查找区县索引
          districtIndex = regionData.provinces[provinceIndex].cities[cityIndex].districts.findIndex(district => district === editInfo.district);
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
    if (this.data.editInfo.birthday) {
      const [year, month, day] = this.data.editInfo.birthday.split('-').map(Number);
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
   * 年份变化时更新日期数组
   */
  onYearChange(e) {
    const yearIndex = e.detail.value;
    const year = this.data.birthdayPicker.years[yearIndex];
    const month = this.data.birthdayPicker.months[this.data.birthdayPicker.monthIndex];
    const days = this.generateDays(year, month);
    
    this.setData({
      'birthdayPicker.yearIndex': yearIndex,
      'birthdayPicker.days': days,
      'birthdayPicker.dayIndex': Math.min(this.data.birthdayPicker.dayIndex, days.length - 1)
    });
  },
  
  /**
   * 月份变化时更新日期数组
   */
  onMonthChange(e) {
    const monthIndex = e.detail.value;
    const month = this.data.birthdayPicker.months[monthIndex];
    const year = this.data.birthdayPicker.years[this.data.birthdayPicker.yearIndex];
    const days = this.generateDays(year, month);
    
    this.setData({
      'birthdayPicker.monthIndex': monthIndex,
      'birthdayPicker.days': days,
      'birthdayPicker.dayIndex': Math.min(this.data.birthdayPicker.dayIndex, days.length - 1)
    });
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
      
      // 过滤不合法字段（与云函数allowKeys对应）
      const validInfo = {};
      const allowKeys = ['nickname', 'avatarUrl', 'phoneNumber', 'gender', 'birthday', 'region'];
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

  // 新增：获取手机号掩码
  getPhoneMask() {
    if (this.data.phoneMask) {
      // 已获取掩码，执行一键登录
      this.oneClickLogin();
      return;
    }

    wx.getPhoneMask({
      success: (res) => {
        console.log('获取手机号掩码成功:', res);
        this.setData({
          phoneMask: res.phoneMask,
          hasPhoneMask: true
        });
        wx.showToast({ title: '手机号掩码获取成功' });
      },
      fail: (err) => {
        console.error('获取手机号掩码失败:', err);
        wx.showToast({ title: '获取手机号掩码失败', icon: 'error' });
      }
    });
  },

  // 新增：本机号码一键登录
  oneClickLogin() {
    wx.weixinAppLogin({
      params: {
        phoneNumber: this.data.phoneMask
      },
      success: (res) => {
        console.log('本机号码一键登录成功:', res);
        // 调用云函数获取真实手机号
        this.getRealPhoneNumber(res.code);
      },
      fail: (err) => {
        console.error('本机号码一键登录失败:', err);
        wx.showToast({ title: '一键登录失败', icon: 'error' });
      }
    });
  },

  // 新增：获取真实手机号
  getRealPhoneNumber(code) {
    wx.cloud.callFunction({
      name: "user-decode-phone",
      data: { code },
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
        wx.showToast({ title: '手机号绑定成功' });
      },
      fail: (err) => {
        wx.showToast({ title: '手机号授权失败', icon: 'error' });
        console.error('手机号解密错误:', err);
      }
    });
  },

  // 保留：获取微信绑定手机号（兼容旧方式）
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
  
  // 昵称输入变化
  onNickNameChange(e) {
    this.setData({
      'editInfo.nickName': e.detail.value
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
  
  // 打开生日选择器
  openBirthdayPicker() {
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
      'editInfo.birthday': birthday,
      showBirthdayPicker: false
    });
    
    wx.showToast({
      title: '生日已更新',
      icon: 'success',
      duration: 2000
    });
  },
  
  // 打开地区选择器
  openCityPicker() {
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
    
    // 合并为一个字符串
    const region = `${province} ${city} ${district}`;
    
    // 更新数据
    this.setData({
      'editInfo.region': region,
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
  },
  
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