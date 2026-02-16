// 搜索页面逻辑
Page({
  /**
   * 页面的初始数据
   */
  data: {
    keyword: '', // 搜索关键词
    searchResults: [], // 搜索结果
    isSearching: false, // 是否正在搜索
    searchHistory: [], // 搜索历史
    isSearched: false // 新增：标记是否已点击搜索按钮（初始为false）
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 加载搜索历史
    this.loadSearchHistory();
    
    // 接收从首页传递过来的搜索关键词
    if (options.keyword) {
      const keyword = decodeURIComponent(options.keyword);
      this.setData({
        keyword: keyword
      });
      // 如果关键词不为空，自动执行搜索
      if (keyword.trim()) {
        this.onSearch();
      }
    }
  },

  /**
   * 加载搜索历史
   */
  loadSearchHistory: function () {
    const searchHistory = wx.getStorageSync('searchHistory') || [];
    this.setData({
      searchHistory: searchHistory
    });
  },

  /**
   * 保存搜索历史
   * @param {string} keyword - 搜索关键词
   */
  saveSearchHistory: function (keyword) {
    let searchHistory = this.data.searchHistory;
    
    // 如果已经存在相同的关键词，先删除
    const index = searchHistory.indexOf(keyword);
    if (index !== -1) {
      searchHistory.splice(index, 1);
    }
    
    // 将新关键词添加到开头
    searchHistory.unshift(keyword);
    
    // 只保留最近10条搜索历史
    if (searchHistory.length > 10) {
      searchHistory = searchHistory.slice(0, 10);
    }
    
    // 保存到本地存储
    wx.setStorageSync('searchHistory', searchHistory);
    
    // 更新页面数据
    this.setData({
      searchHistory: searchHistory
    });
  },

  /**
   * 输入框内容变化处理
   */
  onInputChange: function (e) {
    const keyword = e.detail.value;
    this.setData({
      keyword: keyword
    });
  },

  /**
   * 清除关键词
   */
  onClearKeyword: function () {
    this.setData({
      keyword: ''
    });
  },

  /**
   * 搜索
   */
  onSearch: function () {
    const keyword = this.data.keyword.trim();
    if (!keyword) return;
    
    // 1. 标记“已执行搜索”
    this.setData({ isSearched: true });
    
    // 保存搜索历史
    this.saveSearchHistory(keyword);
    
    // 执行搜索
    this.performSearch(keyword);
  },

  /**
   * 执行搜索
   * @param {string} keyword - 搜索关键词
   */
  performSearch: function (keyword) {
    try {
      this.setData({
        isSearching: true,
        searchResults: []
      });
      
      // 调用云函数获取搜索结果
      wx.cloud.callFunction({
        name: 'product-list',
        data: {
          keyword: keyword,
          page: 1,
          pageSize: 20
        },
        success: res => {
          if (res.result.code === 200) {
            const products = res.result.data?.products || [];
            console.log('搜索结果数据结构:', products);
            console.log('搜索结果数量:', products.length);
            this.setData({
              searchResults: products
            });
          } else {
            console.error('搜索失败:', res.result.message);
            wx.showToast({
              title: '搜索失败',
              icon: 'none'
            });
          }
        },
        fail: error => {
          console.error('搜索失败:', error);
          wx.showToast({
            title: '网络错误',
            icon: 'none'
          });
        },
        complete: () => {
          this.setData({
            isSearching: false
          });
        }
      });
    } catch (error) {
      console.error('搜索异常:', error);
      this.setData({
        isSearching: false
      });
      wx.showToast({
        title: '搜索异常',
        icon: 'none'
      });
    }
  },

  /**
   * 点击搜索历史项
   */
  onHistoryItemClick: function (e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({
      keyword: keyword
    });
    this.onSearch();
  },



  /**
   * 清空搜索历史
   */
  onClearHistory: function () {
    wx.showModal({
      title: '提示',
      content: '确定要清空搜索历史吗？',
      success: res => {
        if (res.confirm) {
          wx.removeStorageSync('searchHistory');
          this.setData({
            searchHistory: []
          });
        }
      }
    });
  },

  /**
   * 删除单个搜索历史
   */
  onDeleteHistory: function (e) {
    const index = e.currentTarget.dataset.index;
    let searchHistory = this.data.searchHistory;
    
    // 从数组中删除对应的搜索记录
    searchHistory.splice(index, 1);
    
    // 更新本地存储
    wx.setStorageSync('searchHistory', searchHistory);
    
    // 更新页面数据
    this.setData({
      searchHistory: searchHistory
    });
  },

  /**
   * 取消搜索
   */
  onCancel: function () {
    wx.navigateBack();
  },

  /**
   * 点击商品项跳转详情页
   */
  onProductClick: function (e) {
    // 从data-id中取ID（dataset的属性名是小写的id，与wxml的data-id对应）
    const productId = e.currentTarget.dataset.id;
    // 强制打印：必须看到具体ID值，不是undefined
    console.log("搜索页点击的商品ID（修正后）:", productId);
    // 若打印是undefined：回到步骤1-2，检查数据源/绑定是否正确
    if (!productId) {
      wx.showToast({ title: "商品ID缺失", icon: "error" });
      return;
    }
    // 跳转详情页
    wx.navigateTo({
      url: `/pages/shop/detail/detail?id=${productId}`
    });
  },

  /**
   * 加入购物车
   */
  onAddToCart: function (e) {
    const productId = e.currentTarget.dataset.id;
    // 跳转到商品详情页，并执行加入购物车操作
    wx.navigateTo({
      url: `/pages/shop/detail/detail?id=${productId}&action=addCart`
    });
  },

  /**
   * 立即购买
   */
  onBuyNow: function (e) {
    const productId = e.currentTarget.dataset.id;
    // 跳转到商品详情页，并执行立即购买操作
    wx.navigateTo({
      url: `/pages/shop/detail/detail?id=${productId}&action=buyNow`
    });
  }
});