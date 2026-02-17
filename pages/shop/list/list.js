const { callCloudFunction } = require('../../../utils/request');

Page({
  data: {
    activeCategory: 'all',
    currentCategoryName: '全部',
    categories: [
      { id: 'all', name: '全部' },
      { id: 'fuxi_dami', name: '富硒大米' },
      { id: 'bucket_water', name: '桶装水' },
      { id: 'bottled_water', name: '瓶装水' },
      { id: 'shiyongyou', name: '食用油' },
      { id: 'qita', name: '其他' }
    ],
    products: [], // 直接存储商品列表，无需分组
    isLoading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    emptyText: '',
    // 搜索相关状态
    isSearching: false,
    searchValue: ''
  },

  onLoad(options) {
    console.log('商品列表页面加载，参数:', options);
    // 第一次加载时执行分类切换逻辑
    this.handleCategorySwitch();
    this.loadProducts();
  },
  
  // 页面显示时执行，包括从其他页面switchTab过来时
  onShow() {
    // 保存当前分类
    const currentCategory = this.data.activeCategory;
    // 处理分类切换
    this.handleCategorySwitch();
    // 如果分类发生了变化，重新加载商品
    if (currentCategory !== this.data.activeCategory) {
      this.loadProducts();
    }
  },
  
  // 处理分类切换逻辑
  handleCategorySwitch() {
    // 获取全局应用实例
    const app = getApp();
    // 检查全局状态中是否有targetCategory
    if (app.globalData.targetCategory) {
      // 查找对应的分类对象
      const targetCategory = app.globalData.targetCategory;
      const category = this.data.categories.find(item => item.id === targetCategory);
      if (category) {
        this.setData({
          activeCategory: targetCategory,
          currentCategoryName: category.name
        });
      }
      // 清除全局状态中的targetCategory
      app.globalData.targetCategory = null;
    }
  },

  // 删除原有的formatProductsToRows方法

  loadProducts(isLoadMore = false) {
    if (this.data.isLoading || (!isLoadMore && !this.data.hasMore)) {
      return;
    }

    console.log(`开始加载商品 ${isLoadMore ? '更多' : ''}...`);
    const params = {
      categoryCode: this.data.activeCategory || 'all',
      page: isLoadMore ? this.data.page + 1 : 1,
      pageSize: this.data.pageSize
    };

    this.setData({ isLoading: true, emptyText: '' });

    callCloudFunction('product-list', params, { loading: false })
      .then(result => {
        console.log('云函数调用成功，结果:', result);
        if (result.code === 200) {
          const originalData = result.data || {};
          const dataArray = Array.isArray(originalData) ? originalData : (originalData.products || []);
          const newProducts = dataArray.filter(item => item && item.productId);
          const products = isLoadMore 
            ? [...this.data.products, ...newProducts] 
            : newProducts;

          this.setData({
            products,
            isLoading: false,
            hasMore: originalData.hasMore || newProducts.length >= this.data.pageSize,
            page: isLoadMore ? this.data.page + 1 : 1,
            emptyText: products.length === 0 ? '暂无商品' : ''
          });
        } else {
          console.error('云函数调用返回错误:', result.message);
          this.setData({
            isLoading: false,
            emptyText: '加载失败，请重试'
          });
        }
      })
      .catch(error => {
        console.error('商品请求失败:', error);
        this.setData({
          isLoading: false,
          emptyText: '加载失败，请重试'
        });
      });
  },

  onCategoryChange(e) {
    const category = e.currentTarget.dataset.category;
    if (this.data.activeCategory === category) return;
    console.log('分类切换:', category);
    
    // 查找当前分类的名称
    const currentCategory = this.data.categories.find(item => item.id === category);
    const categoryName = currentCategory ? currentCategory.name : '全部';
    
    this.setData({
      activeCategory: category,
      currentCategoryName: categoryName,
      hasMore: true,
      page: 1
    });
    this.loadProducts();
  },

  navigateToSearch() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  onProductClick(e) {
    const productId = e.currentTarget.dataset.productid;
    wx.navigateTo({ url: `/pages/shop/detail/detail?id=${productId}` });
  },

  // 加入购物车
  onAddToCart(e) {
    const productId = e.currentTarget.dataset.productid;
    console.log('加入购物车:', productId);
    // 这里可以添加加入购物车的逻辑
    wx.showToast({
      title: '已加入购物车',
      icon: 'success',
      duration: 1500
    });
  },

  onReachBottom() {
    if (!this.data.isLoading && this.data.hasMore) {
      this.loadProducts(true);
    }
  }
});