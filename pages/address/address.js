// 收货地址列表页面逻辑
const app = getApp();
const auth = require('../../utils/auth');

Page({
  data: {
    // 地址列表
    addresses: [],
    // 编辑模式
    editMode: false,
    // 选择模式
    selectMode: false
  },



  // 页面显示
  onShow: function() {
    // 每次页面显示时刷新地址列表
    this.loadAddresses();
  },

  // 返回上一页
  navigateBack: function() {
    wx.navigateBack();
  },

  // 加载地址列表
  loadAddresses: function() {
    wx.cloud.callFunction({
      name: 'address-list',
      success: res => {
        if (res.result.code === 200) {
          this.setData({
            addresses: res.result.data?.addresses || []
          });
        } else {
          wx.showToast({
            title: res.result.message || '获取地址失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('获取地址失败', err);
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      }
    });
  },

  // 切换编辑模式
  toggleEditMode: function() {
    this.setData({
      editMode: !this.data.editMode
    });
  },

  // 页面加载
  onLoad: async function(options) {
    // 检查登录状态
    const isLoggedIn = auth.isLoggedIn();
    if (!isLoggedIn) {
      wx.navigateTo({
        url: '/pages/login/login'
      });
      return;
    }
    
    // 保存选择模式参数
    this.setData({
      selectMode: options.selectMode === 'true'
    });
    
    // 加载地址列表
    this.loadAddresses();
  },

  // 跳转到编辑地址页面
  navigateToEdit: function(e) {
    console.log('========================================');
    console.log('【地址管理日志1】点击了地址相关按钮，事件触发成功');
    console.log('【地址管理日志2】事件参数e:', e);
    
    const addressId = e.currentTarget.dataset.id;
    console.log('【地址管理日志3】addressId:', addressId);
    
    if (addressId && this.data.selectMode) {
      // 选择模式下点击地址，返回订单确认页
      console.log('【地址管理日志4】选择模式，准备返回订单确认页');
      
      // 查找选中的地址
      const selectedAddress = this.data.addresses.find(addr => addr._id === addressId);
      if (selectedAddress) {
        // 获取eventChannel，通过事件通道传递地址数据
        const eventChannel = this.getOpenerEventChannel();
        if (eventChannel) {
          console.log('【地址管理日志5】通过事件通道传递地址数据:', selectedAddress);
          // 发送地址数据到订单确认页
          eventChannel.emit('selectedAddress', { address: selectedAddress });
          // 返回上一个页面
          wx.navigateBack();
        } else {
          // 兼容处理：如果没有eventChannel，使用页面栈方式
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          if (prevPage) {
            console.log('【地址管理日志6】通过页面栈传递地址数据:', selectedAddress);
            // 设置上一个页面的地址数据
            prevPage.setData({
              selectedAddress: selectedAddress
            });
            // 返回上一个页面
            wx.navigateBack();
          }
        }
      }
    } else {
      // 非选择模式，正常跳转到编辑或添加页面
      let url = '';
      if (addressId) {
        // 编辑现有地址
        url = `/pages/address/edit/edit?id=${addressId}`;
      } else {
        // 添加新地址
        url = '/pages/address/new/new';
      }
      
      console.log('【地址管理日志4】准备跳转到URL:', url);
      
      // 尝试跳转
      wx.navigateTo({
        url: url,
        success: function(res) {
          console.log('【地址管理日志7】跳转成功:', res);
          console.log('【地址管理日志8】跳转后的页面栈长度:', getCurrentPages().length);
          console.log('========================================');
        },
        fail: function(err) {
          console.error('【地址管理日志7】跳转失败:', err);
          console.error('【地址管理日志8】错误code:', err.errCode);
          console.error('【地址管理日志9】错误message:', err.errMsg);
          console.error('【地址管理日志10】错误详细信息:', JSON.stringify(err));
          console.error('========================================');
          
          // 显示错误提示
          wx.showToast({
            title: '跳转失败: ' + err.errMsg,
            icon: 'none',
            duration: 3000
          });
        }
      });
    }
  },

  // 设置默认地址
  setDefault: function(e) {
    const addressId = e.currentTarget.dataset.id;
    
    wx.cloud.callFunction({
      name: 'address-set-default',
      data: {
        addressId: addressId
      },
      success: res => {
        if (res.result.code === 200) {
          wx.showToast({
            title: '设置成功'
          });
          // 重新加载地址列表
          this.loadAddresses();
          // 退出编辑模式
          this.setData({
            editMode: false
          });
        } else {
          wx.showToast({
            title: res.result.message || '设置失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('设置默认地址失败', err);
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      }
    });
  },

  // 删除地址
  deleteAddress: function(e) {
    const addressId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '删除地址',
      content: '确定要删除该地址吗？',
      success: res => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'address-delete',
            data: {
              addressId: addressId
            },
            success: res => {
              if (res.result.code === 200) {
                wx.showToast({
                  title: '删除成功'
                });
                // 重新加载地址列表
                this.loadAddresses();
              } else {
                wx.showToast({
                  title: res.result.message || '删除失败',
                  icon: 'none'
                });
              }
            },
            fail: err => {
              console.error('删除地址失败', err);
              wx.showToast({
                title: '网络错误，请稍后重试',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  }
});
