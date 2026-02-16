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
   * 跳转到隐私政策简要版
   */
  navigateToPrivacy() {
    wx.showToast({
      title: '隐私政策开发中',
      icon: 'info',
      duration: 2000
    })
  },

  /**
   * 跳转到个人信息收集清单
   */
  navigateToInfoList() {
    wx.showToast({
      title: '信息收集清单开发中',
      icon: 'info',
      duration: 2000
    })
  },

  /**
   * 跳转到关于详情
   */
  navigateToAbout() {
    wx.showToast({
      title: '关于详情开发中',
      icon: 'info',
      duration: 2000
    })
  }
})