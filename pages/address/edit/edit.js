// 地址编辑页面 JS
Page({
  data: {
    isAdd: true,
    address: {
      id: '',
      name: '',
      phone: '',
      salutation: '',
      province: '',
      city: '',
      district: '',
      detail: '',
      isDefault: false
    },
    // 区域数据
    provinces: [],
    cities: [],
    districts: [],
    selectedRegion: {
      province: '',
      city: '',
      district: ''
    },
    mapLocationInfo: null
  },
  onLoad(options) {
    console.log('地址编辑页面加载:', options);
    this.setData({
      isAdd: !options.id
    });
    this.loadRegionData();
    if (options.id) {
      this.loadAddress(options.id);
    }
  },
  // 加载地址数据
  loadAddress(id) {
    wx.showLoading({ title: '加载中...' });
    // 模拟加载
    setTimeout(() => {
      const mockAddress = {
        id: id,
        name: '张三',
        phone: '13800138000',
        salutation: '先生',
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        detail: '科技园A座1001室',
        isDefault: false
      };
      this.setData({
        address: mockAddress,
        selectedRegion: {
          province: mockAddress.province,
          city: mockAddress.city,
          district: mockAddress.district
        }
      });
      this.updateCities(mockAddress.province);
      this.updateDistricts(mockAddress.city);
      wx.hideLoading();
    }, 500);
  },
  // 加载区域数据
  loadRegionData() {
    const provinces = [
      { id: '1', name: '广东省' },
      { id: '2', name: '北京市' },
      { id: '3', name: '上海市' },
      { id: '4', name: '浙江省' },
      { id: '5', name: '江苏省' },
      { id: '6', name: '四川省' }
    ];
    this.setData({ provinces });
  },
  // 更新城市列表
  updateCities(provinceName) {
    const cityMap = {
      '广东省': [
        { id: '11', name: '深圳市' },
        { id: '12', name: '广州市' },
        { id: '13', name: '东莞市' },
        { id: '14', name: '佛山市' },
        { id: '15', name: '珠海市' }
      ],
      '北京市': [{ id: '21', name: '北京市' }],
      '上海市': [{ id: '31', name: '上海市' }],
      '浙江省': [
        { id: '41', name: '杭州市' },
        { id: '42', name: '宁波市' },
        { id: '43', name: '温州市' }
      ]
    };
    const cities = cityMap[provinceName] || [];
    this.setData({
      cities,
      districts: [],
      selectedRegion: {
        province: provinceName,
        city: '',
        district: ''
      },
      address: {
        ...this.data.address,
        province: provinceName,
        city: '',
        district: ''
      }
    });
  },
  // 更新区县列表
  updateDistricts(cityName) {
    const districtMap = {
      '深圳市': [
        { id: '111', name: '南山区' },
        { id: '112', name: '福田区' },
        { id: '113', name: '罗湖区' },
        { id: '114', name: '宝安区' },
        { id: '115', name: '龙岗区' }
      ],
      '广州市': [
        { id: '121', name: '天河区' },
        { id: '122', name: '越秀区' },
        { id: '123', name: '白云区' }
      ]
    };
    const districts = districtMap[cityName] || [];
    this.setData({
      districts
    });
  },
  // 选择省份
  selectProvince(e) {
    const { province } = e.currentTarget.dataset;
    console.log('选择省份:', province);
    this.updateCities(province);
  },
  // 选择城市
  selectCity(e) {
    const { city } = e.currentTarget.dataset;
    console.log('选择城市:', city);
    this.updateDistricts(city);
    this.setData({
      selectedRegion: {
        ...this.data.selectedRegion,
        city: city
      },
      address: {
        ...this.data.address,
        city: city
      }
    });
  },
  // 选择区县
  selectDistrict(e) {
    const { district } = e.currentTarget.dataset;
    console.log('选择区县:', district);
    this.setData({
      selectedRegion: {
        ...this.data.selectedRegion,
        district: district
      },
      address: {
        ...this.data.address,
        district: district
      }
    });
  },
  // 选择称谓
  selectSalutation(e) {
    const { salutation } = e.currentTarget.dataset;
    this.setData({
      address: {
        ...this.data.address,
        salutation: salutation
      }
    });
  },
  // 表单输入
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      address: {
        ...this.data.address,
        [field]: value
      }
    });
  },
  // 详细地址多行输入
  onTextareaInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      address: {
        ...this.data.address,
        [field]: value
      }
    });
  },
  // 使用腾讯地图精准定位
  getTencentLocation() {
    console.log('开始腾讯地图定位');
    // 调用微信原生地图选择器
    wx.chooseLocation({
      success: (res) => {
        console.log('地图选择结果:', res);
        this.setData({
          mapLocationInfo: {
            address: res.address,
            name: res.name,
            latitude: res.latitude,
            longitude: res.longitude
          },
          address: {
            ...this.data.address,
            detail: res.address || res.name
          }
        });
        wx.showToast({
          title: '定位成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('地图选择失败:', err);
        wx.showToast({
          title: '定位失败',
          icon: 'none'
        });
      }
    });
  },
  // 切换设为默认地址
  toggleDefault() {
    this.setData({
      address: {
        ...this.data.address,
        isDefault: !this.data.address.isDefault
      }
    });
  },
  // 保存地址
  saveAddress() {
    console.log('保存地址:', this.data.address);
    // 验证输入
    if (!this.data.address.name || !this.data.address.phone || !this.data.address.province || !this.data.address.city || !this.data.address.district || !this.data.address.detail) {
      wx.showToast({
        title: '请完善地址信息',
        icon: 'none'
      });
      return;
    }
    // 验证手机号码
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(this.data.address.phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
    wx.showLoading({ title: '保存中...' });
    // 模拟保存
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      this.navigateBack();
    }, 1000);
  },
  // 返回上一页
  navigateBack() {
    wx.navigateBack({
      delta: 1
    });
  }
});