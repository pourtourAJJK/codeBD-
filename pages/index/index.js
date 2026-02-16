// 首页逻辑
const auth = require('../../utils/auth');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 导航栏高度
    navBarHeight: 0,
    contentPaddingTop: 0,
    statusBarHeight: 0,
    // 当前位置信息
    currentLocation: '请选择位置',
    // 轮播图数据
    bannerList: [
      {
        id: '1',
        imageUrl: 'cloud://fuxididai8888-5g9tptvfb7056681.6675-fuxididai8888-5g9tptvfb7056681-1397228946/xishan_photo-ap/轮播-国货.png' ,
        linkUrl: ''
      },
      {
        id: '2',
        imageUrl: 'cloud://fuxididai8888-5g9tptvfb7056681.6675-fuxididai8888-5g9tptvfb7056681-1397228946/xishan_photo-ap/轮播1.png',
        linkUrl: ''
      },
      {
        id: '3',
        imageUrl: 'cloud://fuxididai8888-5g9tptvfb7056681.6675-fuxididai8888-5g9tptvfb7056681-1397228946/xishan_photo-ap/轮播-山.png',
        linkUrl: ''
      }
    ],
    // 快捷入口数据
    quickEntryList: [
      {
        id: 'bigWater',
        name: '桶装水',
        iconUrl: 'cloud://fuxididai8888-5g9tptvfb7056681.6675-fuxididai8888-5g9tptvfb7056681-1397228946/xishan_photo-ap/大瓶扎堆.png'
      },
      {
        id: 'pureWater',
        name: '电子水票',
        iconUrl: 'cloud://fuxididai8888-5g9tptvfb7056681.6675-fuxididai8888-5g9tptvfb7056681-1397228946/xishan_photo-ap/水票-临时.png'
      },
      {
        id: 'smallWater',
        name: '瓶装水',
        iconUrl: 'cloud://fuxididai8888-5g9tptvfb7056681.6675-fuxididai8888-5g9tptvfb7056681-1397228946/xishan_photo-ap/小瓶.png'
      },
      {
        id: 'edibleOil',
        name: '食用油',
        iconUrl: 'cloud://fuxididai8888-5g9tptvfb7056681.6675-fuxididai8888-5g9tptvfb7056681-1397228946/xishan_photo-ap/油-临时.png'
      },
      {
        id: 'seleniumRice',
        name: '富硒大米',
        iconUrl: 'cloud://fuxididai8888-5g9tptvfb7056681.6675-fuxididai8888-5g9tptvfb7056681-1397228946/xishan_photo-ap/米的png.png'
      }
    ],
    // 特色功能数据（兑换卡和限时特价）
    featureList: [
      {
        type: 'exchange',
        name: '兑换卡',
        subtitle: '购卡随水分批提货',
        imageUrl: 'cloud://fuxididai8888-5g9tptvfb7056681.6675-fuxididai8888-5g9tptvfb7056681-1397228946/xishan_photo-ap/大瓶扎堆.png'
      },
      {
        type: 'limited',
        name: '限时特价',
        subtitle: '好水低价秒杀',
        imageUrl: 'cloud://fuxididai8888-5g9tptvfb7056681.6675-fuxididai8888-5g9tptvfb7056681-1397228946/xishan_photo-ap/米的png.png'
      }
    ],
    // 热门商品数据，从cloudbase获取
    hotProducts: [],
    // 保存原始商品数据，用于清空搜索时恢复
    originalHotProducts: [],
    // 购物车商品数量
    cartCount: 0,
    // 搜索相关状态
    searchValue: '', // 搜索框输入内容
    isSearching: false, // 是否正在搜索
    searchResults: [] // 搜索结果
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 检查登录状态
    this.checkLogin();
  },
  
  /**
   * 处理导航栏高度准备好事件
   */
  onNavBarHeightReady: function(e) {
    const { navBarHeight } = e.detail;
    // 搜索栏高度固定为40px
    const searchBarHeight = 40;
    // 计算内容区域的padding-top（导航栏高度 + 搜索栏高度）
    const contentPaddingTop = navBarHeight + searchBarHeight;
    this.setData({
      navBarHeight,
      contentPaddingTop
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 获取购物车数量
    this.getCartCount();
    // 获取热门商品数据
    this.getHotProducts();
  },

  /**
   * 下拉刷新处理
   */
  onPullDownRefresh: function () {
    // 获取购物车数量
    this.getCartCount();
    // 获取热门商品数据
    this.getHotProducts();
    // 停止下拉刷新
    wx.stopPullDownRefresh();
  },
  
  /**
   * 随机从数组中选择指定数量的元素
   */
  getRandomItems: function(array, count) {
    if (!array || array.length === 0) return [];
    if (array.length <= count) return array;
    
    // 深拷贝数组以避免修改原数组
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  },

  /**
   * 从cloudbase查询shop_spu集合数据
   */
  getHotProducts: async function() {
    try {
      // 调用云函数获取商品数据
      const result = await wx.cloud.callFunction({
        name: 'product-list',
        data: {
          categoryCode: 'all'
        }
      });
      
      if (result.result.code === 200) {
        const originalData = result.result.data || {};
        const products = Array.isArray(originalData) ? originalData : (originalData.products || []);
        
        // 随机选择2件商品
        const randomProducts = this.getRandomItems(products, 2);
        
        this.setData({
          hotProducts: randomProducts,
          originalHotProducts: products // 保存原始商品数据，用于清空搜索时恢复
        });
      } else {
        console.error('获取商品数据失败:', result.result.msg);
      }
    } catch (error) {
      console.error('获取商品数据失败:', error);
    }
  },

  /**
   * 检查登录状态
   */
  checkLogin: async function() {
    try {
      const isLoggedIn = auth.isLoggedIn();
      if (!isLoggedIn) {
        console.log('用户未登录');
        // 可以选择跳转到登录页或保持游客模式
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
    }
  },

  /**
   * 获取购物车商品数量
   */
  getCartCount: async function() {
    try {
      const isLoggedIn = auth.isLoggedIn();
      if (!isLoggedIn) {
        this.setData({ cartCount: 0 });
        return;
      }

      const result = await wx.cloud.callFunction({
        name: 'cart-list',
        data: {
          countOnly: true
        }
      });

      if (result.result.code === 200) {
        this.setData({
          cartCount: result.result.data.count || 0
        });
      }
    } catch (error) {
      console.error('获取购物车数量失败:', error);
    }
  },

  /**
   * 搜索框输入监听
   */
  onSearchInput: function(e) {
    this.setData({
      searchValue: e.detail.value
    });
  },

  /**
   * 搜索事件处理
   */
  onSearch: function() {
    const { searchValue } = this.data;
    const trimmedValue = searchValue.trim();
    
    // 跳转到搜索页面，并传递搜索关键词
    wx.navigateTo({
      url: `/pages/search/search?keyword=${encodeURIComponent(trimmedValue)}`
    });
  },

  /**
   * 打开腾讯定位地图选择位置
   */
  navigateToAddress: function() {
    // 直接调用地图选点API
    wx.chooseLocation({
      success: (res) => {
        console.log('地图选点成功', res);
        // 这里可以将选择的位置信息保存到全局或者传递给需要的地方
        // 例如，可以更新首页显示的地址信息
        this.setData({
          currentLocation: res.name || res.address
        });
        
        // 可以选择跳转到地址列表或者直接使用选择的地址
        // wx.navigateTo({
        //   url: '/pages/address/address?location=' + encodeURIComponent(JSON.stringify(res))
        // });
      },
      fail: (err) => {
        console.log('地图选点失败', err);
        // 如果用户拒绝授权，提示用户打开设置
        if (err.errMsg.indexOf('auth deny') > -1) {
          wx.showModal({
            title: '位置授权',
            content: '需要您的位置信息来使用地图选点功能，请开启位置授权',
            success: (modalRes) => {
              if (modalRes.confirm) {
                // 打开设置页面
                wx.openSetting({
                  success: (settingRes) => {
                    if (settingRes.authSetting['scope.userLocation']) {
                      // 用户在设置中开启了授权
                      this.navigateToAddress();
                    }
                  }
                });
              }
            }
          });
        } else {
          // 其他错误，可以选择跳转到地址列表
          // wx.navigateTo({
          //   url: '/pages/address/address'
          // });
        }
      }
    });
  },

  /**
   * 跳转到购物车
   */
  navigateToCart: function() {
    wx.navigateTo({
      url: '/pages/cart/cart'
    });
  },

  /**
   * 快捷入口点击事件
   */
  onQuickEntryClick: function(e) {
    console.log('onQuickEntryClick被调用');
    const entryId = e.currentTarget.dataset.entryId;
    console.log('entryId:', entryId);
    
    // 获取全局应用实例
    const app = getApp();
    let targetCategory = '';
    
    // 根据入口ID设置对应的分类参数，确保与分类页面的分类ID匹配
    switch (entryId) {
      case 'bigWater':
        targetCategory = 'bucket_water'; // 桶装水
        break;
      case 'pureWater':
        targetCategory = 'qita'; // 电子水票
        break;
      case 'smallWater':
        targetCategory = 'bottled_water'; // 瓶装水
        break;
      case 'edibleOil':
        targetCategory = 'shiyongyou'; // 食用油
        break;
      case 'seleniumRice':
        targetCategory = 'fuxi_dami'; // 富硒大米
        break;
      default:
        // 默认不传递分类参数
        targetCategory = 'all';
        break;
    }
    
    console.log('目标分类:', targetCategory);
    
    // 将分类信息存储到全局状态
    app.globalData.targetCategory = targetCategory;
    
    // 执行页面跳转（使用switchTab因为分类页面是tabBar页面）
    wx.switchTab({
      url: '/pages/shop/list/list',
      success: function() {
        console.log('跳转成功');
      },
      fail: function(error) {
        console.error('跳转失败:', error);
        wx.showToast({
          title: '跳转失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 特色功能点击事件
   */
  onFeatureClick: function(e) {
    wx.showModal({
      title: '提示',
      content: '内容正在开发中，敬请期待！',
      showCancel: false,
      confirmText: '确定'
    });
  },

  /**
   * 热门商品点击事件
   */
  onProductClick: function(e) {
    // 从事件对象中获取当前商品的productId
    const productId = e.currentTarget.dataset.productId;
    if (!productId) {
      wx.showToast({ title: '商品ID无效', icon: 'none' });
      return;
    }
    // 跳转到商品详情页，并传递productId
    wx.navigateTo({
      url: `/pages/shop/detail/detail?id=${productId}`
    });
  },

  /**
   * 轮播图点击事件
   */
  onBannerClick: function(e) {
    const bannerId = e.currentTarget.dataset.bannerId;
    console.log('点击轮播图:', bannerId);
    // 可以根据bannerId跳转到相应页面
  },

  /**
   * 跳转到搜索页面
   */
  navigateToSearch: function() {
    wx.navigateTo({
      url: '/pages/search/search'
    });
  }
});