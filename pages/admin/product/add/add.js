// 添加推荐商品页面逻辑

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 商品数据
    productData: {
      title: '',
      description: '',
      category: 'drinks',
      currentPrice: '',
      originalPrice: '',
      stock: 0,
      salesVolume: 0,
      images: [],
      spec: '',
      promotionTag: '',
      isNew: false,
      detailHtml: ''
    },
    // 商品分类列表
    categories: ['drinks', 'snacks', 'instant_food', 'other'],
    // 分类索引
    categoryIndex: 0,
    // 加载状态
    loading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 可以在这里处理从其他页面传递过来的参数
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 页面显示时的处理
  },

  /**
   * 处理表单输入变化
   */
  onInputChange: function (e) {
    const { field, value } = this.getFieldAndValue(e);
    
    if (field) {
      this.setData({
        [`productData.${field}`]: value
      });
    }
  },

  /**
   * 处理开关变化
   */
  onSwitchChange: function (e) {
    const { field, value } = this.getFieldAndValue(e);
    
    if (field) {
      this.setData({
        [`productData.${field}`]: value
      });
    }
  },

  /**
   * 处理分类选择变化
   */
  onCategoryChange: function (e) {
    const index = e.detail.value;
    const category = this.data.categories[index];
    
    this.setData({
      categoryIndex: index,
      [`productData.category`]: category
    });
  },

  /**
   * 获取字段名和值
   */
  getFieldAndValue: function (e) {
    const field = e.currentTarget.dataset.field || e.currentTarget.name;
    const value = e.detail.value;
    
    return { field, value };
  },

  /**
   * 提交表单
   */
  onSubmit: function (e) {
    const { productData } = this.data;
    
    // 表单验证
    if (!productData.title || !productData.currentPrice) {
      wx.showToast({
        title: '商品名称和价格是必填项',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      loading: true
    });
    
    // 调用云函数添加推荐商品
    wx.cloud.callFunction({
      name: 'product-list',
      data: productData
    }).then(res => {
      const result = res.result;
      
      if (result.code === 200) {
        wx.showToast({
          title: '推荐商品添加成功',
          icon: 'success',
          duration: 1500
        });
        
        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.message || '添加失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('添加推荐商品失败:', err);
      wx.showToast({
        title: '添加失败，请稍后重试',
        icon: 'none'
      });
    }).finally(() => {
      this.setData({
        loading: false
      });
    });
  },

  /**
   * 返回上一页
   */
  onBack: function () {
    wx.navigateBack();
  }
});