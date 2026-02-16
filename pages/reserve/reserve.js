// 预约送水页面逻辑
Page({
  /**
   * 页面的初始数据
   */
  data: {
    timeSlots: [],
    selectedDate: '',
    selectedTimeSlot: '',
    address: null,
    notes: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 初始化日期为今天
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    this.setData({
      selectedDate: formattedDate
    });
    
    // 生成时间段
    this.generateTimeSlots();
    
    // 加载默认地址
    this.loadDefaultAddress();
  },

  /**
   * 生成预约时间段
   */
  generateTimeSlots: function () {
    const slots = [];
    const now = new Date();
    const currentHour = now.getHours();
    
    // 生成当天的时间段
    for (let i = 9; i <= 20; i++) {
      if (i > currentHour) {
        slots.push({
          id: `${i}`,
          label: `${i}:00-${i+1}:00`,
          available: true
        });
      }
    }
    
    this.setData({
      timeSlots: slots
    });
  },

  /**
   * 加载默认地址
   */
  loadDefaultAddress: function () {
    wx.cloud.callFunction({
      name: 'address-list',
      success: res => {
        const addresses = res.result.data?.addresses || [];
        if (res.result.code === 200 && addresses.length > 0) {
          // 查找默认地址
          const defaultAddress = addresses.find(addr => addr.isDefault);
          if (defaultAddress) {
            this.setData({
              address: defaultAddress
            });
          } else {
            // 如果没有默认地址，使用第一个地址
            this.setData({
              address: addresses[0]
            });
          }
        } else {
          // 没有地址，提示用户添加
          wx.showToast({
            title: '请先添加地址',
            icon: 'none',
            success: () => {
              setTimeout(() => {
                wx.navigateTo({
                  url: '/pages/address/address'
                });
              }, 1500);
            }
          });
        }
      },
      fail: error => {
        console.error('获取地址失败:', error);
        wx.showToast({
          title: '获取地址失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 选择日期
   */
  onDateChange: function (e) {
    this.setData({
      selectedDate: e.detail.value,
      selectedTimeSlot: ''
    });
    
    // 重新生成时间段
    this.generateTimeSlots();
  },

  /**
   * 选择时间段
   */
  onTimeSlotSelect: function (e) {
    const timeSlotId = e.currentTarget.dataset.id;
    this.setData({
      selectedTimeSlot: timeSlotId
    });
  },

  /**
   * 输入备注
   */
  onNotesInput: function (e) {
    this.setData({
      notes: e.detail.value
    });
  },

  /**
   * 提交预约
   */
  submitReserve: function () {
    if (!this.data.selectedDate || !this.data.selectedTimeSlot || !this.data.address) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }
    
    // 调用云函数提交预约
    wx.cloud.callFunction({
      name: 'reserve',
      data: {
        date: this.data.selectedDate,
        timeSlot: this.data.selectedTimeSlot,
        address: this.data.address,
        notes: this.data.notes
      },
      success: res => {
        if (res.result.code === 200) {
          wx.showToast({
            title: '预约成功',
            icon: 'success',
            success: () => {
              setTimeout(() => {
                wx.navigateBack({
                  delta: 1
                });
              }, 1500);
            }
          });
        } else {
          wx.showToast({
            title: '预约失败: ' + res.result.message,
            icon: 'none'
          });
        }
      },
      fail: error => {
        console.error('预约失败:', error);
        wx.showToast({
          title: '预约失败，请重试',
          icon: 'none'
        });
      }
    });
  }
});