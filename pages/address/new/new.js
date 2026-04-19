// pages/address/new/new.js
const app = getApp();
Page({
  data: {
    // 表单数据
    formData: {
      name: '', // 收货人姓名
      phone: '', // 联系电话
      province: '', // 省份
      city: '', // 城市
      district: '', // 区县
      detail: '', // 详细地址
      street: '', // 街道地址
      houseNumber: '', // 门牌号（非必填）
      isDefault: false, // 是否为默认地址
      tag: '' // 地址标签
    },
    // 地址标签选项
    tagOptions: ['家', '公司', '父母', '朋友', '其他'],
    // 加载状态
    loading: false,
    // 编辑模式相关
    editId: '',
    isEdit: false,
    // 自定义地址数据
    addressData: [
      {
        name: '广东省',
        cities: [
          {
            name: '汕头市',
            districts: ['金平区', '龙湖区', '濠江区', '潮阳区', '潮南区', '澄海区', '南澳县']
          },
          {
            name: '广州市',
            districts: ['越秀区', '海珠区', '荔湾区', '天河区', '白云区', '黄埔区', '番禺区', '花都区', '南沙区', '从化区', '增城区']
          },
          {
            name: '湛江市',
            districts: ['赤坎区', '霞山区', '坡头区', '麻章区', '遂溪县', '徐闻县', '廉江市', '雷州市', '吴川市']
          }
        ]
      },
      {
        name: '江西省',
        cities: [
          {
            name: '宜春市',
            districts: ['袁州区', '奉新县', '万载县', '上高县', '宜丰县', '靖安县', '铜鼓县', '丰城市', '樟树市', '高安市']
          }
        ]
      }
    ],
    // 地址选择器状态
    addressPickerVisible: false,
    // 当前选中的地址索引
    addressIndexes: [0, 0, 0]
  },

  // 页面加载
  onLoad: function(options) {
    console.log('新增地址页面加载成功', options);
    this.setData({
      from: options.from || 'addressList',
      editId: options.id || '',
      isEdit: !!options.id
    }, () => {

      if (this.data.editId) {
        this.loadAddressDetail(this.data.editId);
      }
    });
  },


  // 返回上一页
  navigateBack: function() {
    wx.navigateBack();
  },

  // 加载已有地址详情用于回填
  loadAddressDetail: function(addressId) {
    console.log('[address-new] 加载地址详情用于回填，id:', addressId);
    wx.cloud.callFunction({
      name: 'address-get',
      data: { addressId },
      success: (res) => {
        if (res?.result?.code === 200 && res.result.data?.address) {
          const addr = res.result.data.address;
          this.setData({
            formData: {
              ...this.data.formData,
              name: addr.name || '',
              phone: addr.phone || '',
              province: addr.province || '',
              city: addr.city || '',
              district: addr.district || '',
              detail: addr.detail || addr.street || '',
              houseNumber: addr.houseNumber || '',
              isDefault: !!addr.isDefault,
              tag: addr.tag || ''
            }
          });
          // 设置地址选择器索引
          this.setAddressIndexes(addr.province, addr.city, addr.district);
        } else {
          wx.showToast({ title: res?.result?.message || '加载地址失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('[address-new] 加载地址详情失败', err);
        wx.showToast({ title: '加载地址失败', icon: 'none' });
      }
    });
  },

  // 设置地址选择器索引
  setAddressIndexes: function(province, city, district) {
    const { addressData } = this.data;
    let provinceIndex = 0;
    let cityIndex = 0;
    let districtIndex = 0;

    // 查找省份索引
    for (let i = 0; i < addressData.length; i++) {
      if (addressData[i].name === province) {
        provinceIndex = i;
        // 查找城市索引
        for (let j = 0; j < addressData[i].cities.length; j++) {
          if (addressData[i].cities[j].name === city) {
            cityIndex = j;
            // 查找区县索引
            for (let k = 0; k < addressData[i].cities[j].districts.length; k++) {
              if (addressData[i].cities[j].districts[k] === district) {
                districtIndex = k;
                break;
              }
            }
            break;
          }
        }
        break;
      }
    }

    this.setData({
      addressIndexes: [provinceIndex, cityIndex, districtIndex]
    });
  },

  // 显示地址选择器
  showAddressPicker: function() {
    this.setData({
      addressPickerVisible: true
    });
  },

  // 隐藏地址选择器
  hideAddressPicker: function() {
    this.setData({
      addressPickerVisible: false
    });
  },

  // 地址选择器值变化
  onAddressPickerChange: function(e) {
    const indexes = e.detail.value;
    this.setData({
      addressIndexes: indexes
    });
  },

  // 地址选择器确认
  confirmAddressPicker: function() {
    const { addressData, addressIndexes } = this.data;
    const [provinceIndex, cityIndex, districtIndex] = addressIndexes;
    
    const province = addressData[provinceIndex].name;
    const city = addressData[provinceIndex].cities[cityIndex].name;
    const district = addressData[provinceIndex].cities[cityIndex].districts[districtIndex];

    this.setData({
      'formData.province': province,
      'formData.city': city,
      'formData.district': district,
      addressPickerVisible: false
    });
  },

  // 获取微信地址

  getWechatAddress: function() {
    wx.chooseAddress({
      success: (res) => {
        console.log('获取微信地址成功:', res);
        
        // 验证地址是否在指定区域
        const province = res.provinceName;
        const city = res.cityName;
        
        // 允许的区域
        const allowedAreas = [
          { province: '广东省', city: '汕头市' },
          { province: '广东省', city: '广州市' },
          { province: '广东省', city: '湛江市' },
          { province: '江西省', city: '宜春市' }
        ];
        
        // 检查地址是否在允许列表中
        const isAllowed = allowedAreas.some(area => 
          area.province === province && area.city === city
        );
        
        if (!isAllowed) {
          wx.showToast({
            title: '该地区暂无配送场所，请重新选择',
            icon: 'none',
            duration: 2000
          });
          return;
        }
        
        this.setData({
          formData: {
            ...this.data.formData,
            name: res.userName,
            phone: res.telNumber,
            province: res.provinceName,
            city: res.cityName,
            district: res.countyName,
            detail: res.detailInfo,
            isDefault: false
          }
        });
      },
      fail: (err) => {
        console.error('获取微信地址失败:', err);
        wx.showToast({
          title: '获取地址失败',
          icon: 'none'
        });
      }
    });
  },

  // 输入框内容变化
  onInputChange: function(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 选择省市区
  onRegionChange: function(e) {
    const region = e.detail.value;
    this.setData({
      'formData.province': region[0],
      'formData.city': region[1],
      'formData.district': region[2]
    });
  },

  // 切换默认地址
  onDefaultToggle: function(e) {
    this.setData({
      'formData.isDefault': e.detail.value
    });
  },

  // 选择地址标签
  onTagSelect: function(e) {
    const tag = e.currentTarget.dataset.tag;
    this.setData({
      'formData.tag': tag
    });
  },

  /**
   * 保存地址 - 完整的表单提交逻辑
   * 功能：验证必填字段 → 提交到数据库 → 显示成功提示 → 自动跳转
   */
  saveAddress: function() {
    console.log('[address-new] 点击保存收货地址按钮');
    console.log('[address-new] 当前表单数据:', this.data.formData);
    
    // ==================== 第一步：前端数据验证 ====================
    const { formData } = this.data;
    
    // 1. 验证收货人姓名（必填）
    if (!formData.name || !formData.name.trim()) {
      wx.showToast({ 
        title: '请输入收货人姓名', 
        icon: 'none',
        duration: 2000 
      });
      console.log('[address-new] 验证失败：收货人姓名为空');
      return;
    }
    
    // 2. 验证联系电话（必填）
    if (!formData.phone || !formData.phone.trim()) {
      wx.showToast({ 
        title: '请输入联系电话', 
        icon: 'none',
        duration: 2000 
      });
      console.log('[address-new] 验证失败：联系电话为空');
      return;
    }
    
    // 3. 优化的手机号格式验证
    // 支持标准11位手机号，自动清理空格
    const phoneRegex = /^1[3-9]\d{9}$/;
    const cleanPhone = formData.phone.trim().replace(/\s+/g, ''); // 移除所有空格
    
    if (!phoneRegex.test(cleanPhone)) {
      wx.showToast({ 
        title: '手机号格式不正确', 
        icon: 'none',
        duration: 2000 
      });
      console.log('[address-new] 验证失败：手机号格式错误', cleanPhone);
      return;
    }
    
    console.log('[address-new] 手机号验证通过:', cleanPhone);
    
    // 4. 验证所在地区（必填：省市区）
    if (!formData.province || !formData.city || !formData.district) {
      wx.showToast({ 
        title: '请选择所在地区', 
        icon: 'none',
        duration: 2000 
      });
      console.log('[address-new] 验证失败：地区未选择');
      return;
    }
    
    // 5. 验证详细地址（必填）
    if (!formData.detail || !formData.detail.trim()) {
      wx.showToast({ 
        title: '请输入收货地址', 
        icon: 'none',
        duration: 2000 
      });
      console.log('[address-new] 验证失败：详细地址为空');
      return;
    }
    
    // 6. 门牌号为选填，不验证
    console.log('[address-new] 门牌号:', formData.houseNumber || '(未填写)');
    
    console.log('[address-new] ✅ 所有必填字段验证通过');
    
    // ==================== 第二步：数据预处理 ====================
    // 更新为清理后的手机号
    formData.phone = cleanPhone;
    
    // 构造完整地址（门牌号为可选）
    const fullAddress = `${formData.province}${formData.city}${formData.district}${formData.detail}${formData.houseNumber ? formData.houseNumber : ''}`;
    
    console.log('[address-new] 完整地址:', fullAddress);
    
    // 准备提交的数据
    const submitData = {
      name: formData.name.trim(),
      phone: cleanPhone,
      province: formData.province,
      city: formData.city,
      district: formData.district,
      detail: formData.detail.trim(),
      houseNumber: (formData.houseNumber || '').trim(), // ✅ 确保门牌号始终为字符串
      isDefault: formData.isDefault || false,
      tag: formData.tag || '',
      fullAddress: fullAddress,
      street: formData.detail.trim() // 兼容旧数据结构
    };
    
    console.log('[address-new] 准备提交的数据:', JSON.stringify(submitData, null, 2));
    
    // ==================== 第三步：显示加载状态 ====================
    this.setData({ loading: true });
    
    wx.showLoading({
      title: this.data.isEdit ? '正在更新...' : '正在保存...',
      mask: true
    });
    
    // ==================== 第四步：提交到后端数据库 ====================
    const fnName = this.data.isEdit ? 'address-update' : 'address-create';
    const payload = this.data.isEdit ? { addressId: this.data.editId, ...submitData } : submitData;
    console.log(`[address-new] 🚀 准备调用云函数 ${fnName}`);
    console.log('[address-new] 📦 请求参数:', JSON.stringify(payload, null, 2));
    
    wx.cloud.callFunction({
      name: fnName,
      data: payload,

      success: (res) => {
        console.log('[address-new] ✅ 云函数返回成功');
        console.log('[address-new] 📥 返回数据:', JSON.stringify(res, null, 2));
        
        // 检查返回状态
        if (res.result.code !== 200) {
          wx.hideLoading();
          wx.showToast({
            title: res.result.message || '保存地址失败',
            icon: 'none',
            duration: 2000
          });
          console.error('[address-new] 保存失败:', res.result.message);
          return;
        }
        
        // ==================== 第五步：保存成功处理 ====================
        console.log('[address-new] ✅ 地址保存成功');
        
        const createdAddress = res.result.data?.address || null;
        const addressId = this.data.isEdit ? this.data.editId : res.result.data?.addressId;
        
        wx.hideLoading();
        
        // 显示成功提示
        wx.showToast({
          title: this.data.isEdit ? '地址已更新' : '地址保存成功',
          icon: 'success',
          duration: 1500
        });
        

        // ==================== 第六步：页面跳转逻辑 ====================
        setTimeout(() => {
          console.log('[address-new] 准备执行页面跳转...');
          
          // 优先级1：登录流程的跳转（targetPage）
          const targetPage = wx.getStorageSync("targetPage");
          if (targetPage && targetPage.url) {
            console.log('[address-new] 检测到登录流程，跳转到目标页:', targetPage.url);
            wx.removeStorageSync("targetPage"); // 用完即删
            
            if (targetPage.type === "switchTab") {
              wx.switchTab({ url: targetPage.url });
            } else {
              wx.redirectTo({ 
                url: targetPage.url,
                fail: () => {
                  // 如果redirectTo失败，尝试switchTab（可能是首页）
                  wx.switchTab({ url: targetPage.url });
                }
              });
            }
            return;
          }
          
          // 优先级2：从订单确认页跳转来的，返回订单页并传递地址数据
          if (this.data.from === 'order') {
            console.log('[address-new] 从订单页跳转来，返回订单页并传递地址数据');
            
            // 构造地址数据，确保字段匹配
            const newAddress = createdAddress || {
              ...submitData,
              _id: addressId,
              region: `${submitData.province}${submitData.city}${submitData.district}`
            };
            
            // 尝试通过事件通道传递数据
            const eventChannel = this.getOpenerEventChannel();
            if (eventChannel) {
              console.log('[address-new] 通过事件通道传递新地址数据');
              eventChannel.emit('selectedAddress', { address: newAddress });
            } else {
              // 兼容处理：通过页面栈传递数据
              const pages = getCurrentPages();
              const prevPage = pages[pages.length - 2];
              if (prevPage) {
                console.log('[address-new] 通过页面栈传递新地址数据');
                prevPage.setData({ selectedAddress: newAddress });
              }
            }
            
            wx.navigateBack();
            return;
          }

          // 从地址列表创建新地址，保存后返回地址列表
          if (this.data.from === 'addressList') {
            console.log('[address-new] 从地址列表进入，保存后返回列表');
            wx.navigateBack();
            return;
          }
          
          if (this.data.isEdit) {
            console.log('[address-new] 编辑完成，返回上一页');
            wx.navigateBack();
            return;
          }
          
          // 优先级3：默认跳转到首页
          console.log('[address-new] 没有特殊跳转需求，跳转到首页');

          wx.switchTab({ 
            url: '/pages/index/index',
            success: () => {
              console.log('[address-new] ✅ 成功跳转到首页');
            },
            fail: (err) => {
              console.error('[address-new] 跳转首页失败:', err);
              // 如果switchTab失败，尝试返回上一页
              wx.navigateBack();
            }
          });
          
        }, 1500); // 等待Toast显示完成

      },
      fail: (err) => {
        console.error('[address-new] ❌ 云函数调用失败');
        console.error('[address-new] 错误信息:', JSON.stringify(err, null, 2));
        console.error('[address-new] 错误详情:', {
          errMsg: err.errMsg,
          errCode: err.errCode,
          name: err.name,
          message: err.message
        });
        
        wx.hideLoading();
        wx.showToast({
          title: '保存地址失败，请重试',
          icon: 'none',
          duration: 2000
        });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  }
});
