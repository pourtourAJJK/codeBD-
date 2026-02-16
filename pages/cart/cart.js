// 购物车页面逻辑
const auth = require('../../utils/auth.js');
const cartUtil = require('../../utils/cartUtil.js');
const { callCloudFunction } = require('../../utils/request');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    cartItems: [], // 购物车商品列表
    isAllSelected: false, // 是否全选
    totalPrice: 0, // 总价格
    selectedCount: 0, // 选中商品数量
    hasSelectedItems: false, // 是否有选中商品
    loading: false, // 加载状态
    errorMessage: '', // 错误信息
    discountPrice: 0, // 已优惠金额
    isManageMode: false, // 管理模式状态
    // 推荐商品相关
    recommendProducts: [], // 推荐商品列表
    isLoadingRecommend: false // 推荐商品加载状态
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    console.log('购物车页面加载');
    this.checkLoginAndLoadData();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
    console.log('购物车页面显示');
    this.checkLoginAndLoadData();
  },

  /**
   * 检查登录状态并加载数据
   */
  checkLoginAndLoadData: function() {
    console.log('检查登录状态...');
    const openid = wx.getStorageSync('openid');

    if (!openid) {
      console.log('用户未登录，跳转到授权页');
      wx.setStorageSync('targetPage', { url: '/pages/cart/cart', type: 'switchTab' });
      wx.navigateTo({
        url: '/pages/login/auth/auth'
      });
      return;
    }

    console.log('用户已登录，开始加载购物车数据');
    this.waitLoginAndGetCart();
  },

  /**
   * 核心：等待登录态就绪，再请求购物车数据（带重试）
   */
  waitLoginAndGetCart() {
    const app = getApp();
    // 若已登录，直接查数据
    if (app.globalData.isLogin) {
      this.loadCartData();
      return;
    }

    // 若未登录，每隔500ms检查一次，最多等5秒
    let retryCount = 0;
    const timer = setInterval(() => {
      retryCount++;
      // 登录就绪 → 查数据+清除定时器
      if (app.globalData.isLogin) {
        clearInterval(timer);
        this.loadCartData();
      }
      // 超过5秒仍未登录 → 提示用户
      if (retryCount >= 10) {
        clearInterval(timer);
        wx.showToast({ title: "登录超时，请重启小程序", icon: "none" });
      }
    }, 500);
  },

  /**
   * 加载购物车数据 - 带全量报错监控
   */
  loadCartData: async function() {
    try {
      this.setData({ loading: true, errorMessage: '' });
      console.log('[购物车查询] 开始查询购物车数据');

      const app = getApp();
      // 二次校验：确保openid存在
      if (!app.globalData.openid) {
        wx.showToast({ title: "请先登录", icon: "none" });
        return;
      }
      
      const openid = app.globalData.openid;
      console.log('[购物车查询] 用户openid：', openid);

      // 调用云函数获取购物车数据
      console.log('[购物车查询] 调用cart-list云函数...');
      const res = await wx.cloud.callFunction({
        name: 'cart-list',
        data: { openid: app.globalData.openid }
      });

      console.log('[购物车查询] cart-list云函数返回结果:', JSON.stringify(res, null, 2));

      // 检查云函数调用结果
      if (!res || !res.result) {
        console.error("[购物车报错] 云函数调用结果异常", {
          环节: "云函数调用",
          原因: "云函数未返回结果",
          错误详情: res,
          用户openid: openid
        });
        this.setData({ errorMessage: '云函数调用结果异常' });
        return;
      }

      // 检查云函数返回的code
      if (res.result.code !== 200) {
        console.error("[购物车报错] 云函数返回错误码", {
          环节: "云函数执行",
          原因: res.result.message || "云函数返回错误",
          错误码: res.result.code,
          用户openid: openid
        });
        this.setData({ errorMessage: res.result.message || '加载购物车失败' });
        return;
      }

      console.log('[购物车查询] 获取购物车数据成功，原始数据:', res.result.data);
      
      // 检查返回的数据格式
      if (!res.result.data || !Array.isArray(res.result.data.cartItems)) {
        console.error("[购物车报错] 购物车数据格式异常", {
          环节: "数据格式检查",
          原因: "返回数据格式异常，cartItems不是数组",
          返回数据: res.result.data,
          用户openid: openid
        });
        this.setData({ errorMessage: '购物车数据格式异常' });
        return;
      }
      
      // 检查购物车数据是否为空
      const cartItems = res.result.data.cartItems;
      if (cartItems.length === 0) {
        console.log('[购物车查询] 购物车为空，兜底查询全量数据排查...');
        // 兜底查询所有数据，排查openid匹配问题
        wx.cloud.database().collection('cart')
          .get()
          .then(allRes => {
            console.warn("[购物车报错] 该用户无数据，全量数据参考", {
              环节: "数据查询",
              原因: "该用户购物车无数据",
              用户openid: openid,
              该用户查询结果: cartItems,
              集合全量数据: allRes.data
            });
          })
          .catch(err => {
            console.error("[购物车报错] 全量数据查询失败", {
              环节: "兜底查询",
              原因: err.errMsg,
              错误详情: err
            });
          });
      } else {
        // 检查第一个商品的必填字段
        const firstItem = cartItems[0];
        const requiredFields = ["producttitle", "productTitle", "spec", "currentPrice", "quantity"];
        const missingFields = requiredFields.filter(field => !firstItem[field]);
        
        if (missingFields.length > 0) {
          console.error("[购物车报错] 渲染字段缺失", {
            环节: "渲染字段检查",
            原因: `缺少必要渲染字段：${missingFields.join(",")}`,
            商品数据示例: firstItem
          });
          this.setData({ errorMessage: `渲染失败：缺少${missingFields.join(",")}字段` });
          return;
        }
      }
      
      // 格式化购物车数据
      const formattedCartItems = cartItems.map(item => ({
        ...item,
        checked: item.checked || false,
        productTitle: item.productTitle || item.producttitle || '商品名称',
        productImage: item.productImage || '/assets/images/default-product.png',
        currentPrice: item.currentPrice || 0
      }));

      console.log('[购物车查询] 格式化后的购物车数据:', JSON.stringify(formattedCartItems, null, 2));
      console.log('[购物车查询] 购物车商品数量:', formattedCartItems.length);

      this.setData({ cartItems: formattedCartItems });
      // 更新购物车状态（全选、总价等）
      this.updateCartStatus();
      // 缓存购物车数据
      cartUtil.saveCartData(formattedCartItems);
      
      // 如果购物车为空，加载推荐商品
      if (formattedCartItems.length === 0) {
        console.log('[购物车查询] 购物车为空，加载推荐商品');
        this.loadRecommendProducts();
      } else {
        console.log('[购物车查询] 购物车有商品，清空推荐商品');
        // 如果购物车有商品，清空推荐商品
        this.setData({ recommendProducts: [] });
      }
    } catch (error) {
      console.error("[购物车报错] 查询失败", {
        环节: "整个查询流程",
        原因: error.errMsg || error.message,
        错误详情: error
      });
      // 显示详细的错误信息
      const errorMsg = error.errMsg || error.message || '网络错误，请重试';
      this.setData({ errorMessage: errorMsg });
      // 打印完整的错误对象
      console.error('[购物车报错] 完整错误信息:', JSON.stringify(error, null, 2));
    } finally {
      this.setData({ loading: false });
      console.log('[购物车查询] 加载购物车数据完成');
    }
  },

  /**
   * 切换商品选中状态
   */
  toggleItemCheck: function(e) {
    const { index } = e.currentTarget.dataset;
    const cartItems = [...this.data.cartItems];
    cartItems[index].checked = !cartItems[index].checked;
    
    this.setData({ cartItems });
    this.updateCartStatus();
  },

  /**
   * 全选/取消全选
   */
  toggleSelectAll: function() {
    const isAllSelected = !this.data.isAllSelected;
    const cartItems = this.data.cartItems.map(item => ({
      ...item,
      checked: isAllSelected
    }));
    
    this.setData({ 
      cartItems, 
      isAllSelected 
    });
    this.updateCartStatus();
  },

  /**
   * 减少商品数量
   */
  decreaseQuantity: async function(e) {
    const { index, itemId } = e.currentTarget.dataset;
    const cartItems = [...this.data.cartItems];
    
    // 如果数量≤1，直接删除商品
    if (cartItems[index].quantity <= 1) {
      try {
        this.setData({ loading: true });
        
        // 调用云函数删除商品
        await wx.cloud.callFunction({
          name: 'cart-update-item',
          data: {
            itemId,
            action: 'delete'
          }
        });
        
        wx.showToast({ title: "商品已移除购物车" });
        
        // 重新加载购物车数据
        await this.loadCartData();
      } catch (error) {
        console.error('删除商品失败:', error);
        wx.showToast({ 
          title: "操作失败，请重试", 
          icon: "none" 
        });
      } finally {
        this.setData({ loading: false });
      }
    } else {
      // 数量>1时，更新数量
      cartItems[index].quantity--;
      
      this.setData({ cartItems });
      this.updateCartStatus();
      
      // 更新购物车云数据
      try {
        await wx.cloud.callFunction({
          name: 'cart-update-item',
          data: {
            itemId,
            quantity: cartItems[index].quantity
          }
        });
      } catch (error) {
        console.error('更新购物车数量失败:', error);
        wx.showToast({ title: '更新失败，请重试', icon: 'none' });
      }
    }
  },

  /**
   * 增加商品数量
   */
  increaseQuantity: async function(e) {
    const { index, itemId } = e.currentTarget.dataset;
    const cartItems = [...this.data.cartItems];
    
    if (cartItems[index].quantity < 999) {
      cartItems[index].quantity++;
      this.setData({ cartItems });
      this.updateCartStatus();
      
      // 更新购物车云数据
      try {
        await wx.cloud.callFunction({
          name: 'cart-update-item',
          data: {
            itemId,
            quantity: cartItems[index].quantity
          }
        });
      } catch (error) {
        console.error('更新购物车数量失败:', error);
        wx.showToast({ title: '更新失败，请重试', icon: 'none' });
      }
    } else {
      wx.showToast({ title: '已达到最大购买数量', icon: 'none' });
    }
  },

  /**
   * 删除单个商品
   */
  deleteItem: async function(e) {
    const { index, itemId } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个商品吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 调用云函数删除商品
            const result = await wx.cloud.callFunction({
              name: 'cart-update-item',
              data: {
                itemId,
                action: 'delete'
              }
            });
            
            if (result.result.code === 200) {
              // 更新本地数据
              const cartItems = [...this.data.cartItems];
              cartItems.splice(index, 1);
              this.setData({ cartItems });
              this.updateCartStatus();
              wx.showToast({ title: '删除成功' });
            } else {
              wx.showToast({ title: '删除失败', icon: 'none' });
            }
          } catch (error) {
            console.error('删除商品失败:', error);
            wx.showToast({ title: '删除失败，请重试', icon: 'none' });
          }
        }
      }
    });
  },

  /**
   * 跳转到商品详情页
   */
  navigateToDetail: function(e) {
    const { productId } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/shop/detail/detail?productId=${productId}`
    });
  },

  /**
   * 跳转到订单确认页
   */
  navigateToConfirm: function() {
    const selectedItems = this.data.cartItems.filter(item => item.checked);
    
    // 检查是否有选中商品
    if (selectedItems.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }
    
    // 检查库存
    const outOfStockItems = selectedItems.filter(item => item.quantity > item.stock);
    if (outOfStockItems.length > 0) {
      wx.showToast({ title: '部分商品库存不足', icon: 'none' });
      return;
    }
    
    // 将选中的商品信息传递给订单确认页
    const orderItems = selectedItems.map(item => ({
      productId: item.productId,
      productTitle: item.productTitle,
      productImage: item.productImage,
      spec: item.spec,
      quantity: item.quantity,
      currentPrice: item.currentPrice,
      originalPrice: item.originalPrice
    }));
    
    wx.navigateTo({
      url: '/pages/order/confirm/confirm?source=cart',
      events: {
        // 监听订单确认页的事件
        onOrderCreated: () => {
          // 订单创建成功后，重新加载购物车数据
          this.loadCartData();
        }
      },
      success: (res) => {
        // 向订单确认页传递数据
        res.eventChannel.emit('cartItems', {
          cartItems: selectedItems,
          totalPrice: this.data.totalPrice,
          selectedCount: this.data.selectedCount
        });
      }
    });
  },

  /**
   * 去购物
   */
  goShopping: function() {
    wx.switchTab({ url: '/pages/index/index' });
  },
  
  /**
   * 重新加载购物车
   */
  retryLoad: function() {
    this.loadCartData();
  },

  /**
   * 更新购物车状态（全选、总价、选中数量等）
   */
  updateCartStatus: function() {
    const { cartItems } = this.data;
    
    // 计算选中的商品数量
    const selectedCount = cartItems.filter(item => item.checked && item.stock > 0).length;
    
    // 计算总价和原价
    let totalPrice = 0;
    let originalTotal = 0;
    
    cartItems.forEach(item => {
      if (item.checked && item.stock > 0) {
        totalPrice += item.currentPrice * item.quantity;
        originalTotal += (item.originalPrice || item.currentPrice) * item.quantity;
      }
    });
    
    totalPrice = Number(totalPrice.toFixed(2)); // 保留两位小数
    const discountPrice = Number((originalTotal - totalPrice).toFixed(2)); // 计算优惠金额
    
    // 判断是否全选
    const isAllSelected = selectedCount > 0 && selectedCount === cartItems.filter(item => item.stock > 0).length;
    
    this.setData({
      selectedCount,
      totalPrice,
      discountPrice,
      isAllSelected,
      hasSelectedItems: selectedCount > 0
    });
  },

  /**
   * 数量输入处理
   */
  onQuantityInput: async function(e) {
    const { index, itemId } = e.currentTarget.dataset;
    let { value } = e.detail;
    
    // 校验输入内容为合法数字
    value = parseInt(value);
    if (isNaN(value) || value < 0) {
      value = 0;
    }
    
    // 限制不超过999
    if (value > 999) {
      value = 999;
      wx.showToast({ title: '已达到最大购买数量', icon: 'none' });
    }
    
    const cartItems = [...this.data.cartItems];
    const item = cartItems[index];
    
    if (item.quantity !== value) {
      cartItems[index].quantity = value;
      this.setData({ cartItems });
      this.updateCartStatus();
      
      // 更新购物车云数据
      try {
        await wx.cloud.callFunction({
          name: 'cart-update-item',
          data: {
            itemId,
            quantity: value
          }
        });
      } catch (error) {
        console.error('更新购物车数量失败:', error);
        wx.showToast({ title: '更新失败，请重试', icon: 'none' });
      }
    }
  },
  
  /**
   * 加载推荐商品数据
   */
  loadRecommendProducts: function() {
    if (this.data.isLoadingRecommend) {
      return;
    }

    this.setData({ isLoadingRecommend: true });

    // 调用云函数获取商品数据，不显示loading，避免与其他loading冲突
    callCloudFunction('product-list', {
      categoryCode: 'all',
      page: 1,
      pageSize: 10
    }, {
      loading: false
    })
      .then(result => {
        console.log('加载推荐商品成功:', result);
        // 直接使用result中的数据，不检查code，因为callCloudFunction已经处理了
        const originalData = result.data || {};
        // 检查data是否为数组，如果是对象则取products属性
        const dataArray = Array.isArray(originalData) ? originalData : (originalData.products || []);
        
        // 过滤掉缺失productId的无效商品
        const validProducts = dataArray.filter(item => item && item.productId);
        
        // 随机选择两个商品
        let recommendProducts = [];
        if (validProducts.length > 0) {
          // 随机打乱数组
          const shuffled = validProducts.sort(() => 0.5 - Math.random());
          // 取前两个
          recommendProducts = shuffled.slice(0, 2);
        }
        
        this.setData({ 
          recommendProducts,
          isLoadingRecommend: false
        });
      })
      .catch(error => {
        console.error('加载推荐商品失败:', error);
        this.setData({ isLoadingRecommend: false });
      });
  },

  /**
   * 推荐商品点击事件
   */
  onProductClick: function(e) {
    const productId = e.currentTarget.dataset.productId;
    wx.navigateTo({
      url: `/pages/shop/detail/detail?id=${productId}`
    });
  },

  /**
   * 推荐商品加入购物车事件
   */
  onAddCart: async function(e) {
    const product = e.currentTarget.dataset.product;
    
    try {
      // 检查登录状态
      const isLogin = auth.isLoggedIn();
      if (!isLogin) {
        wx.navigateTo({ url: '/pages/login/login' });
        return;
      }

      // 调用云函数将商品加入购物车
      const result = await wx.cloud.callFunction({
        name: 'cart-add-item',
        data: {
          productId: product.productId,
          quantity: 1,
          productInfo: {
            name: product.name,
            price: product.price,
            promotionPrice: product.promotionPrice || product.price,
            spec: product.spec,
            cover_image: product.cover_image
          }
        }
      });

      if (result.result.code === 200) {
        // 加入购物车成功，显示提示
        wx.showToast({ title: '加入购物车成功' });
        
        // 重新加载购物车数据，更新页面状态
        this.loadCartData();
      } else {
        // 加入购物车失败
        wx.showToast({ title: result.result.message || '加入购物车失败', icon: 'none' });
      }
    } catch (error) {
      console.error('加入购物车失败:', error);
      wx.showToast({ title: '加入购物车失败，请重试', icon: 'none' });
    }
  },

  /**
   * 显示优惠明细
   */
  showDiscountDetail: function() {
    wx.showModal({
      title: '优惠明细',
      content: `优惠券优惠：¥${this.data.discountPrice}`,
      showCancel: false
    });
  },
  
  /**
   * 切换管理模式
   */
  toggleManageMode: function() {
    this.setData({
      isManageMode: !this.data.isManageMode,
      isAllSelected: false // 切换模式时重置全选状态
    });
    
    // 重置商品选中状态
    const cartItems = [...this.data.cartItems];
    cartItems.forEach(item => {
      item.checked = false;
    });
    
    this.setData({ cartItems });
    this.updateCartStatus();
  },

  /**
   * 删除选中商品
   */
  deleteSelected: async function() {
    // 筛选出已选中的商品ID
    const selectedItems = this.data.cartItems.filter(item => item.checked);
    
    if (selectedItems.length === 0) {
      wx.showToast({ 
        title: "请选择要删除的商品", 
        icon: "none" 
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除选中的${selectedItems.length}个商品吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            this.setData({ loading: true });
            
            // 批量删除选中商品
            for (const item of selectedItems) {
              await wx.cloud.callFunction({
                name: 'cart-update-item',
                data: {
                  itemId: item._id,
                  action: 'delete'
                }
              });
            }
            
            wx.showToast({ title: "删除成功" });
            
            // 重新加载购物车数据
            await this.loadCartData();
            
            // 退出管理模式
            this.setData({ isManageMode: false });
          } catch (error) {
            console.error('删除选中商品失败:', error);
            wx.showToast({ 
              title: "删除失败，请重试", 
              icon: "none" 
            });
          } finally {
            this.setData({ loading: false });
          }
        }
      }
    });
  },

  /**
   * 购物车商品点击跳转至详情页
   */
  goToDetail: function(e) {
    // 获取点击商品的productId（从wxml的data-productid传递）
    const productId = e.currentTarget.dataset.productid;
    if (!productId) {
      wx.showToast({ title: "商品信息异常", icon: "none" });
      return;
    }

    // 跳转到商品详情页（路径需与你的详情页路径一致）
    wx.navigateTo({
      url: `/pages/shop/detail/detail?productId=${productId}`, // 传递商品ID作为参数
      fail: (err) => {
        console.error("跳转详情页失败:", err);
        wx.showToast({ title: "跳转失败", icon: "none" });
      }
    });
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {
    this.loadCartData().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});