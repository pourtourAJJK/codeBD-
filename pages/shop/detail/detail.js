// 商品详情页逻辑
const auth = require('../../../utils/auth.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    product: {
      _id: '',
      name: '',
      price: 0,
      spec: '',
      detail: '',
      'cover-image': '',
      stock: 0,
      lockedStock: 0
    },
    isLoading: true,
    showSpecModal: false,
    selectedSpec: '',
    quantity: 1 // 默认数量为1
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 打印所有参数，确认是否有id或productId
    console.log("详情页接收的参数:", options);
    // 兼容两种参数名：id（原有）和productId（购物车跳转）
    const productId = options.id || options.productId;
    console.log("详情页接收的商品ID（修正后）:", productId);
    // 若productId是undefined：回到步骤3，检查搜索页的跳转url参数名是否是id
    if (productId) {
      // 修复action字段undefined报错：给action添加默认值
      const actionVal = options.action || '';
      this.setData({
        productId: productId,
        action: actionVal // 接收从搜索页面传递过来的操作类型，确保不是undefined
      });
      this.loadProductDetail(productId);
    } else {
      wx.showToast({
        title: '商品ID无效',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 加载商品详情数据：从后端接口拉取当前商品对应的数据库完整数据
   */
  loadProductDetail(productId) {
    console.log('开始加载商品详情，ID:', productId);
    console.log('商品ID类型:', typeof productId); // 打印ID类型
    
    this.setData({ isLoading: true });
    
    // 调用云函数获取商品详情
    wx.cloud.callFunction({
      name: 'product-detail',
      data: {
        id: productId
      }
    })
    .then(res => {
      console.log('云函数调用成功，结果:', res);
      const result = res.result || {};
      
      if (result.code === 200 && result.data) {
        let productData = result.data;
        // 新增日志：打印是否收到detail
        console.log("[商品详情-接收检查]", {
          是否有detail: productData.detail ? "是" : "否",
          detail内容: productData.detail
        });
        // 新增日志：打印是否收到tuwen_detail
        console.log("[图文详情-字段接收]", {
          是否存在tuwen_detail: productData.tuwen_detail ? "是" : "否",
          tuwen_detail内容: productData.tuwen_detail,
          内容类型: typeof productData.tuwen_detail
        });
        
        // 数据预处理：解决库存字段NaN问题
        console.log("[库存处理-原始数据]", {
          stock: productData.stock,
          stock类型: typeof productData.stock,
          lockedStock: productData.lockedStock,
          lockedStock类型: typeof productData.lockedStock
        });
        
        // 1. 处理stock字段：确保转换为数字类型
        // 原因：微搭平台可能将数字字段解析为字符串，或存在null/undefined情况
        productData.stock = this.parseStockField(productData.stock);
        
        // 2. 处理lockedStock字段：确保转换为数字类型
        productData.lockedStock = this.parseStockField(productData.lockedStock);
        
        console.log("[库存处理-转换后数据]", {
          stock: productData.stock,
          stock类型: typeof productData.stock,
          lockedStock: productData.lockedStock,
          lockedStock类型: typeof productData.lockedStock
        });
        
        // 3. 处理富文本内容：确保图片路径正确
        if (productData.detail) {
          console.log("[富文本处理-原始值]", productData.detail);
          // 确保富文本内容为字符串
          if (typeof productData.detail === 'string') {
            // 这里可以添加富文本处理逻辑，确保图片路径正确
            // 例如，替换旧的环境A链接为环境B链接
            console.log("[富文本处理] 富文本内容已确认，准备渲染");
          } else {
            console.warn("[富文本处理] 富文本内容类型错误，期望字符串，实际:", typeof productData.detail);
            // 转换为字符串类型
            productData.detail = String(productData.detail);
          }
        }
        
        // 动态填充商品数据
        this.setData({
          product: productData,
          isLoading: false
        }, () => {
          // 1. 基础日志：确认tuwen_detail是否接收成功
          console.log("[图文详情-渲染前检查]", {
            页面data中的tuwen_detail: this.data.product.tuwen_detail,
            是否为空: !this.data.product.tuwen_detail,
            内容长度: this.data.product.tuwen_detail?.length || 0
          });

          // 2. 处理tuwen_detail字段：确保图片URL格式正确
          if (this.data.product.tuwen_detail) {
            console.log("[图文详情-原始值]", this.data.product.tuwen_detail);
            // 调用解析函数，修复img标签样式（添加自适应宽度）
            const parsedRichText = this.parseRichText(this.data.product.tuwen_detail);
            // 更新处理后的富文本
            this.setData({
              'product.tuwen_detail': parsedRichText
            });
            console.log("[图文详情-处理后值]", parsedRichText);
          }
          
          // 根据action参数执行相应操作
          if (this.data.action) {
            setTimeout(() => {
              if (this.data.action === 'addCart') {
                this.showSpecSelector(); // 执行加入购物车
              } else if (this.data.action === 'buyNow') {
                this.onBuyNow(); // 执行立即购买
              }
            }, 300); // 延迟执行，确保页面渲染完成
          }
        });
      } else {
        console.error('[图文详情-接口请求失败]', result.msg || '未知错误');
        // 云函数调用失败时的处理
        if (result.msg === '商品不存在') {
          // 显示友好的提示信息
          wx.showToast({
            title: '商品不存在或已下架',
            icon: 'none',
            duration: 2000
          });
          // 2秒后跳回上一页
          setTimeout(() => {
            wx.navigateBack({
              delta: 1
            });
          }, 2000);
        } else {
          // 其他错误，使用模拟数据进行兜底
          this.setData({
            product: {
              _id: '',
              name: '商品名称',
              price: 0,
              'original-price': 0,
              spec: '',
              detail: '',
              tuwen_detail: '',
              'cover-image': '/assets/images/search.svg'
            },
            isLoading: false
          });
        }
      }
    })
    .catch(error => {
      console.error('[图文详情-接口请求失败]', error);
      // 云函数调用失败时，使用模拟数据进行兜底
      this.setData({
        product: {
          _id: '',
          name: '商品名称',
          price: 0,
          'original-price': 0,
          spec: '',
          detail: '',
          tuwen_detail: '',
          'cover-image': '/assets/images/search.svg'
        },
        isLoading: false
      });
    });
  },

  /**
   * 返回上一页
   */
  navigateBack() {
    wx.navigateBack();
  },

  /**
   * 显示规格选择器
   */
  showSpecSelector() {
    this.setData({
      showSpecModal: true
    });
  },

  /**
   * 关闭规格选择器
   */
  closeSpecModal() {
    this.setData({
      showSpecModal: false
    });
  },

  /**
   * 减少数量
   */
  decreaseQuantity() {
    if (this.data.quantity > 0) {
      this.setData({
        quantity: this.data.quantity - 1
      });
    }
  },

  /**
   * 增加数量
   */
  increaseQuantity() {
    const availableStock = this.data.product.stock || 999; // 默认999，如果没有库存数据
    const lockedStock = this.data.product.lockedStock || 0;
    const maxQuantity = Math.max(1, availableStock - lockedStock || 999); // 确保至少为1
    
    if (this.data.quantity < maxQuantity) {
      this.setData({
        quantity: this.data.quantity + 1
      });
    }
  },

  /**
   * 减少数量
   */
  decreaseQuantity() {
    if (this.data.quantity > 1) { // 最小数量为1
      this.setData({
        quantity: this.data.quantity - 1
      });
    }
  },

  /**
   * 数量输入框事件处理
   */
  onQuantityInput(e) {
    let inputValue = parseInt(e.detail.value) || 1; // 默认值为1
    const availableStock = this.data.product.stock || 999; // 默认999，如果没有库存数据
    const lockedStock = this.data.product.lockedStock || 0;
    const maxQuantity = Math.max(1, availableStock - lockedStock || 999); // 确保至少为1
    // 确保输入值在1-可用库存范围内
    inputValue = Math.max(1, Math.min(inputValue, maxQuantity));
    this.setData({
      quantity: inputValue
    });
  },

  /**
   * 加入购物车
   */
  onAddToCart: async function() {
    // 登录检查
    if (!auth.isLoggedIn()) {
      wx.showModal({
        title: '未注册',
        content: '您尚未登录，请先登录后再进行操作',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/user/profile/profile'
            });
          }
        }
      });
      return;
    }

    const { product, quantity } = this.data;
    
    // 前置校验报错
    if (!product) {
      console.error("[加购前置报错] 商品信息为空", { product, quantity });
      wx.showToast({ title: "加购失败：商品信息缺失", icon: "none" });
      return;
    }
    
    const numQuantity = Number(quantity);
    if (numQuantity < 1 || numQuantity > 999) {
      console.error("[加购前置报错] 数量超出限制", { count: numQuantity, limit: "1-999" });
      wx.showToast({ title: `加购失败：数量需在1-999之间`, icon: "none" });
      return;
    }

    // 检查商品信息是否存在
    if (!product.name || !product.price) {
      console.error("[加购前置报错] 商品信息不完整，缺少必要字段", { product, quantity });
      wx.showToast({ title: "加购失败：商品信息不完整", icon: "none" });
      return;
    }

    // 构建纯净的productInfo，仅包含5个字段
    const productInfo = {
      spuId: String(product._id), // 从shop_spu集合获取的商品_id
      name: product.name || '商品名称',
      price: Number(product.price) || 0,
      spec: product.spec || '默认规格',
      count: numQuantity
    };
    
    // 打印日志，确认productInfo包含spuId且无冗余内容
    console.log("前端传递的productInfo：", JSON.stringify(productInfo));
    
    try {
      // 调用云函数将商品加入购物车
      console.log('调用cart-add-item云函数...');
      const result = await wx.cloud.callFunction({
        name: 'cart-add-item',
        data: {
          productInfo: productInfo
        }
      });
      
      console.log('加入购物车云函数返回结果:', JSON.stringify(result, null, 2));
      
      // 检查云函数调用结果
      if (!result || !result.result) {
        console.error("[加购失败] 云函数调用结果异常", {
          环节: "云函数调用",
          原因: "云函数未返回结果",
          入参: { productInfo },
          错误详情: result
        });
        wx.showModal({
          title: '加入购物车失败',
          content: '云函数调用结果异常',
          showCancel: false
        });
        return;
      }
      
      // 兼容两种返回格式：{ code: 0 } 和 { success: true }
      if (result.result.code === 200) {
        // 加入购物车成功，显示提示
        wx.showToast({
          title: result.result.message || result.result.msg || '已加入购物车',
          icon: 'success'
        });
        
        this.closeSpecModal();
        
        // 加购后立即校验数据库是否写入
        this.checkCartDB(productInfo.spuId, numQuantity);
      } else {
        // 加入购物车失败，显示详细错误信息
        const errorMsg = result.result.message || result.result.msg || result.result.error || '加入购物车失败';
        console.error("[加购失败] 云函数返回错误", {
          环节: "云函数执行",
          原因: errorMsg,
          入参: { productInfo },
          云函数返回: result
        });
        console.error('完整的错误结果:', JSON.stringify(result.result, null, 2));
        wx.showModal({
          title: '加入购物车失败',
          content: errorMsg,
          showCancel: false
        });
      }
    } catch (error) {
      // 捕获到异常，显示详细错误信息
      let errorMsg = '';
      if (error.errMsg) {
        errorMsg = error.errMsg;
      } else if (error.message) {
        errorMsg = error.message;
      } else {
        errorMsg = JSON.stringify(error);
      }
      console.error("[加购失败] 云函数调用失败", {
        环节: "云函数调用",
        原因: errorMsg,
        入参: { productInfo },
        错误详情: error
      });
      wx.showModal({
        title: '加入购物车异常',
        content: `加购失败：${errorMsg}`,
        showCancel: false
      });
    }
  },

  // 校验数据库是否写入商品（加购后立即验证）
  checkCartDB: function(spuId, quantity) {
    if (!spuId) return;
    
    // 获取用户openid
    const openid = auth.getOpenid();
    
    if (!openid) {
      console.log("[加购校验] 用户未登录，跳过数据库校验", {
        环节: "数据库校验",
        原因: "用户未登录",
        商品ID: spuId
      });
      return;
    }
    
    try {
      wx.cloud.database().collection('cart')
        .where({
          openid: openid,
          productId: spuId // 匹配集合中的商品ID字段
        })
        .get()
        .then(res => {
          if (res.data.length === 0) {
            console.log("[加购校验] 数据库未找到商品，可能是首次添加或数据延迟", {
              环节: "数据库写入",
              校验条件: { openid, productId: spuId },
              数据库查询结果: res.data
            });
          } else {
            console.log("[加购校验成功] 数据库已写入", res.data);
            // 检查数量是否正确
            const cartItem = res.data[0];
            if (cartItem.quantity !== quantity) {
              console.warn("[加购校验警告] 数据库数量与请求数量不一致", {
                请求数量: quantity,
                数据库数量: cartItem.quantity,
                商品ID: spuId
              });
            }
          }
        })
        .catch(err => {
          console.error("[加购校验失败] 数据库查询失败", {
            环节: "数据库校验",
            原因: err.errMsg,
            错误详情: err
          });
        });
    } catch (error) {
      console.error("[加购校验异常] 校验过程中发生错误", {
        环节: "数据库校验",
        错误详情: error
      });
    }
  },

  /**
   * 立即购买
   */
  onBuyNow() {
    // 登录检查
    if (!auth.isLoggedIn()) {
      wx.showModal({
        title: '未注册',
        content: '您尚未登录，请先登录后再进行操作',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/user/profile/profile'
            });
          }
        }
      });
      return;
    }

    // 新增：打印调试日志，看函数是否触发、变量值是否正常
    console.log('===== 点击立即购买，进入onBuyNow函数 =====');
    console.log('当前商品信息：', this.data.product); // 看商品是否获取到
    console.log('当前购买数量：', this.data.quantity); // 看数量是否合法

    // 原有验证逻辑
    if (!this.data.product) {
      wx.showToast({ title: '商品信息异常', icon: 'none' });
      console.error('❌ 商品信息为空，验证失败'); // 新增：标记错误
      return;
    }
    if (this.data.quantity < 1) {
      wx.showToast({ title: '请选择购买数量', icon: 'none' });
      console.error('❌ 购买数量小于1，验证失败，当前数量：', this.data.quantity); // 新增
      return;
    }

    // 原有构建订单商品信息逻辑
    const orderProduct = {
      id: this.data.product._id, // 订单确认页期望的是id字段
      productId: this.data.product._id, // 同时保留productId字段，确保兼容性
      name: this.data.product.name, // 订单确认页期望的是name字段
      price: this.data.product.price, // 订单确认页期望的是price字段
      coverImage: this.data.product['cover-image'],
      spec: this.data.product.spec || '默认规格',
      quantity: this.data.quantity,
      originalPrice: this.data.product.originalPrice || this.data.product.price
    };
    console.log('✅ 商品信息验证通过，构建的订单商品信息：', orderProduct); // 新增

    // 原有跳转逻辑
    wx.navigateTo({
      url: `/pages/order/confirm/confirm?source=detail`,
      success: (res) => {
        console.log('✅ 页面跳转请求发送成功，开始发送事件通道数据'); // 新增
        res.eventChannel.emit('productInfo', {
          product: orderProduct
        });
      },
      fail: (err) => { // 新增：捕获跳转失败的错误
        console.error('❌ 页面跳转失败：', err);
        wx.showToast({ title: '页面跳转失败，请重试', icon: 'none' });
      }
    });
    
    this.closeSpecModal();
},
  
  /**
   * 跳转到首页
   */
  navigateToHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },
  
  /**
   * 跳转到购物车
   */
  navigateToCart() {
    wx.switchTab({ url: '/pages/cart/cart' });
  },

  /**
   * 图片加载失败处理
   * 功能：当图片加载失败时，替换为默认占位图
   */
  imageError(e) {
    console.error('图片加载失败:', e.detail.errMsg);
    
    // 获取图片组件的ID或索引
    const { target } = e;
    
    // 尝试设置默认占位图
    // 注意：在WXML中直接绑定error事件时，无法直接修改src
    // 这里我们通过修改product数据来实现占位图效果
    if (this.data.product && this.data.product.tuwen_detail) {
      // 创建product的副本
      const productCopy = { ...this.data.product };
      // 设置默认占位图（使用项目中现有的默认图片或网络占位图）
      productCopy.tuwen_detail = '/assets/images/search.svg';
      // 更新数据
      this.setData({
        product: productCopy
      });
      console.log('图片加载失败，已替换为默认占位图');
    }
  },
  
  /**
   * 图片加载成功处理
   */
  imageLoad(e) {
    console.log('图片加载成功:', e.detail.width, 'x', e.detail.height);
    // 可以在这里添加图片加载成功后的处理逻辑
  },
  
  /**
   * 富文本加载错误处理
   */
  richTextError(e) {
    console.error('富文本加载失败:', e.detail.errMsg);
    // 可以在这里添加富文本加载错误后的处理逻辑
  },
  
  /**
   * 解析库存字段，确保转换为有效数字
   * 解决NaN问题的核心逻辑
   * @param {*} value - 原始库存值
   * @returns {number} - 转换后的数字库存值
   */
  parseStockField(value) {
    console.log('[库存处理] 开始处理库存值:', value, '类型:', typeof value);
    
    // 情况1：值为null、undefined、空字符串、false、0或NaN时，返回0
    if (value === null || value === undefined || value === '' || value === false || value === 0 || (typeof value === 'number' && isNaN(value))) {
      console.log('[库存处理] 空值或无效值情况，返回0:', value);
      return 0;
    }
    
    // 情况2：值已经是数字类型且为正数
    if (typeof value === 'number') {
      // 确保是正数
      const positiveValue = Math.max(0, value);
      console.log('[库存处理] 数字类型，返回正数:', value, '->', positiveValue);
      return positiveValue;
    }
    
    // 情况3：值是字符串类型
    if (typeof value === 'string') {
      // 去除前后空格
      const trimmedValue = value.trim();
      // 检查是否为空字符串
      if (trimmedValue === '') {
        console.log('[库存处理] 空字符串，返回0:', value);
        return 0;
      }
      
      // 尝试转换为数字
      const numValue = Number(trimmedValue);
      // 检查转换是否成功（非NaN）且为正数
      if (!isNaN(numValue)) {
        const positiveValue = Math.max(0, numValue);
        console.log('[库存处理] 字符串转数字成功:', value, '->', positiveValue);
        return positiveValue;
      } else {
        console.log('[库存处理] 字符串转数字失败，返回0:', value);
        return 0;
      }
    }
    
    // 情况4：其他类型（如对象、数组等）
    console.log('[库存处理] 其他类型，返回0:', value, '类型:', typeof value);
    return 0;
  },

  /**
   * 解析富文本，修复img标签渲染问题（核心新增函数）
   * @param {string} html - 原始富文本字符串
   * @returns {string} - 处理后的富文本字符串
   */
  parseRichText(html) {
    if (!html) return '';
    // 1. 清理无效的uploading占位符/blob链接（避免渲染垃圾内容）
    html = html.replace(/<span class="exeditor-file-uploading"[\s\S]*?<\/span>/g, '');
    html = html.replace(/<img[^>]+src=["']blob:[^"'][^>]*>/g, '');
    // 2. 强制给所有img标签加自适应样式（解决rich-text不渲染图片的核心）
    html = html.replace(/<img([^>]*)>/g, (match, attr) => {
      // 保留原有属性，追加100%宽度+自动高度样式
      return `<img ${attr} style="width:100%;height:auto;display:block;margin:5px 0;" />`;
    });
    return html;
  }
});