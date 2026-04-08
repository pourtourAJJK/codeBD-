// 编辑地址页面
Page({
  data: {
    address: {
      name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail: '',
      isDefault: false
    }
  },

  onLoad: function(options) {
    // 从选项中获取地址ID
    const addressId = options.id;
    if (addressId) {
      // 如果有地址ID，加载地址信息
      this.loadAddress(addressId);
    }
  },

  // 加载地址信息
  loadAddress: function(addressId) {
    // 这里可以调用云函数获取地址信息
    // 暂时使用模拟数据
    this.setData({
      address: {
        name: '张三',
        phone: '13800138000',
        province: '广东省',
        city: '广州市',
        district: '越秀区',
        detail: '文德路1号',
        isDefault: true
      }
    });
  },

  // 输入框输入事件
  onInput: function(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`address.${field}`]: value
    });
  },

  // 选择地址
  chooseAddress: function() {
    wx.chooseAddress({
      success: (res) => {
        this.setData({
          address: {
            ...this.data.address,
            name: res.userName,
            phone: res.telNumber,
            province: res.provinceName,
            city: res.cityName,
            district: res.countyName,
            detail: res.detailInfo
          }
        });
      }
    });
  },

  // 切换默认地址
  toggleDefault: function() {
    this.setData({
      'address.isDefault': !this.data.address.isDefault
    });
  },

  // 保存地址
  saveAddress: function() {
    const { address } = this.data;
    
    // 验证输入
    if (!address.name || !address.phone || !address.detail) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    
    // 这里可以调用云函数保存地址
    wx.showToast({ title: '保存成功', icon: 'success' });
    wx.navigateBack();
  }
});