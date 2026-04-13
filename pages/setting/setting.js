// 关于页面
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 页面相关数据
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 打开微信官方隐私政策页面
   */
  navigateToPrivacy() {
    wx.openPrivacyContract({
      success: function(res) {
        console.log('打开隐私政策成功', res)
      },
      fail: function(err) {
        console.error('打开隐私政策失败', err)
        wx.showToast({
          title: '打开隐私政策失败',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  /**
   * 退出登录
   */
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          console.log('用户确认退出登录');
          // 清除本地存储的用户信息
          wx.clearStorageSync();
          console.log('本地存储已清除');
          
          // 清除全局数据中的用户信息
          const app = getApp();
          app.globalData.isLogin = false;
          app.globalData.userInfo = null;
          app.globalData.openid = '';
          app.globalData.token = '';
          console.log('全局数据已清除');
          
          // 跳转到主页首页
          wx.switchTab({
            url: '/pages/index/index'
          });
          console.log('已跳转到首页');
        } else {
          console.log('用户取消退出登录');
        }
      }
    });
  },


})