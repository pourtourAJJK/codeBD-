// 地址列表页面
Page({
  data: {
    addressList: [],
    selectedAddressId: ''
  },

  onLoad: function(options) {
    // 从页面参数中获取选中的地址ID
    if (options.selectedId) {
      this.setData({
        selectedAddressId: options.selectedId
      });
    }
    // 获取地址列表
    this.getAddressList();
  },

  onShow: function() {
    // 页面显示时重新获取地址列表
    this.getAddressList();
  },

  // 获取地址列表
  getAddressList: function() {
    wx.cloud.callFunction({
      name: 'address-list',
      data: {}
    }).then(res => {
      if (res.result.code === 200) {
        this.setData({
          addressList: res.result.data || []
        });
      }
    }).catch(err => {
      console.error('获取地址列表失败:', err);
    });
  },

  // 选择地址
  selectAddress: function(e) {
    const addressId = e.currentTarget.dataset.id;
    // 返回到上一页，并传递选中的地址ID
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    if (prevPage) {
      prevPage.setData({
        selectedAddressId: addressId
      });
      wx.navigateBack();
    }
  },

  // 编辑地址
  editAddress: function(e) {
    const addressId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/user/address/edit/edit?id=${addressId}`
    });
  },

  // 删除地址
  deleteAddress: function(e) {
    const addressId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'address-delete',
            data: {
              id: addressId
            }
          }).then(res => {
            if (res.result.code === 200) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              // 重新获取地址列表
              this.getAddressList();
            }
          }).catch(err => {
            console.error('删除地址失败:', err);
          });
        }
      }
    });
  },

  // 添加新地址
  addAddress: function() {
    wx.navigateTo({
      url: '/pages/user/address/edit/edit'
    });
  },

  // 返回上一页
  navigateBack: function() {
    wx.navigateBack();
  },

  // 设置默认地址
  setDefaultAddress: function(e) {
    const addressId = e.currentTarget.dataset.id;
    wx.cloud.callFunction({
      name: 'address-set-default',
      data: {
        id: addressId
      }
    }).then(res => {
      if (res.result.code === 200) {
        wx.showToast({
          title: '设置成功',
          icon: 'success'
        });
        // 重新获取地址列表
        this.getAddressList();
      }
    }).catch(err => {
      console.error('设置默认地址失败:', err);
    });
  }
});