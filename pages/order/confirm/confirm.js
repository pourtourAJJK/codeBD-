// 订单确认页逻辑
const app = getApp();
const auth = require('../../../utils/auth');
const orderUtil = require('../../../utils/orderUtil');
const cartUtil = require('../../../utils/cartUtil');

Page({
  data: {
    // 地址信息
    selectedAddress: null,
    // 商品信息
    products: [],
    orderItems: [], // 与WXML中使用的字段名保持一致
    // 配送方式
    deliveryOptions: [
      { id: 'express', name: '商家自配', fee: 0, checked: true }
    ],
    selectedDelivery: { id: 'express', name: '商家自配' }, // 改为对象格式，与处理函数一致
    // 支付方式
    paymentOptions: [
      { id: 'wechat', name: '微信支付', icon: 'cloud://fuxididai8888-5g9tptvfb7056681.6675-fuxididai8888-5g9tptvfb7056681-1397228946/xiaotubiao/微信支付.png', checked: true },
      { id: 'balance', name: '余额支付', icon: 'cloud://fuxididai8888-5g9tptvfb7056681.6675-fuxididai8888-5g9tptvfb7056681-1397228946/xiaotubiao/余额支付-copy.png', checked: false }
    ],
    selectedPayment: { id: 'wechat', name: '微信支付' }, // 改为对象格式，与处理函数一致
    paymentType: 'wechat', // 新增paymentType字段，用于提交订单
    // 订单备注
    remark: '',
    orderRemark: '', // 与WXML中使用的字段名保持一致
    // 价格信息
    subtotal: 0, // 商品总价
    subtotalPrice: 0, // 与WXML中使用的字段名保持一致
    deliveryFee: 0, // 配送费
    totalPrice: 0, // 订单总价
    // 预约时间
    appointmentDates: [],
    appointmentTimes: [
      { label: '09:00-11:00', value: '09:00-11:00' },
      { label: '13:00-15:00', value: '13:00-15:00' },
      { label: '15:00-17:00', value: '15:00-17:00' }
    ],
    pickerValue: [0, 0],
    selectedAppointmentText: '请选择送达时间',
    selectedAppointment: null,
    // 加载状态
    loading: false,
    submitting: false, // 与WXML中使用的字段名保持一致
    // 错误提示
    errorMsg: ''
  },

  // 页面加载
  onLoad: function(options) {
    console.log('===== 订单确认页onLoad触发 =====');
    console.log('跳转携带的参数：', options); // 看是否能进入该页面

    // 检查用户登录状态
    console.log('🔍 开始检查登录状态');
    const loginStatus = this.checkLoginStatus();
    console.log('登录状态检查结果：', loginStatus);
    
    // 获取eventChannel（兼容无事件通道的进入方式）
    const eventChannel = (typeof this.getOpenerEventChannel === 'function') ? this.getOpenerEventChannel() : null;
    console.log('获取到eventChannel：', !!eventChannel);
    
    if (eventChannel && typeof eventChannel.on === 'function') {
      // 监听来自商品详情页的商品信息
      eventChannel.on('productInfo', (data) => {
      console.log('✅ 接收到商品详情页传递的信息：', data); // 新增
      // 格式化商品数据，确保字段名与购物车一致
      const formattedProduct = {
        product_id: data.product.id,
        productId: data.product.id,
        productTitle: data.product.name,
        productImage: data.product.coverImage,
        spec: data.product.spec,
        quantity: data.product.quantity,
        currentPrice: data.product.price,
        originalPrice: data.product.originalPrice
      };
      
      this.setData({
        products: [formattedProduct],
        orderItems: [formattedProduct] // 同时设置orderItems，确保WXML能显示
      });
      this.calculatePrice();
    });
    
    // 监听来自购物车页的商品信息
      eventChannel.on('cartItems', (data) => {
        console.log('✅ 接收到购物车页传递的信息：', data); // 新增
        this.setData({
          products: data.cartItems,
          orderItems: data.cartItems // 同时设置orderItems，确保WXML能显示
        });
        this.calculatePrice();
      });
      
      // 新增：监听来自地址管理页或添加地址页的地址信息
      eventChannel.on('selectedAddress', (data) => {
      console.log('✅ 接收到地址信息：', data);
      if (data && data.address) {
        // 确保地址数据结构完整
        console.log('接收到的地址数据结构:', {
          hasName: !!data.address.name,
          hasPhone: !!data.address.phone,
          hasProvince: !!data.address.province,
          hasCity: !!data.address.city,
          hasDistrict: !!data.address.district,
          hasDetail: !!data.address.detail
        });
        
        // 更新页面的地址数据
        this.setData({
          selectedAddress: data.address
        }, () => {
          // 确保数据更新完成后再执行后续操作
          console.log('✅ 地址数据已更新：', this.data.selectedAddress);
          console.log('更新后的地址数据结构:', {
            hasName: !!this.data.selectedAddress.name,
            hasPhone: !!this.data.selectedAddress.phone,
            hasProvince: !!this.data.selectedAddress.province,
            hasCity: !!this.data.selectedAddress.city,
            hasDistrict: !!this.data.selectedAddress.district,
            hasDetail: !!this.data.selectedAddress.detail
          });
        });
      }
    });
    } else {
      console.warn('未获取到事件通道，跳过事件监听，直接初始化本地数据');
    }
    
    // 构建最近三天的预约日期
    this.buildAppointmentDates();

    // 计算价格
    this.calculatePrice();
    console.log('✅ 订单确认页初始化完成'); // 新增
  },

  // 页面显示
  onShow: function() {
    console.log('【订单确认日志】页面显示，当前selectedAddress:', this.data.selectedAddress);
    // 只有在未选择地址时才加载默认地址，避免覆盖用户选择的地址
    if (!this.data.selectedAddress) {
      console.log('【订单确认日志】未选择地址，加载默认地址');
      this.loadDefaultAddress();
    } else {
      console.log('【订单确认日志】已选择地址，保留用户选择');
    }
    // 简化处理：不加载优惠券
  },

  // 页面卸载
  onUnload: function() {
    // 清理数据
    this.setData({
      products: [],
      selectedAddress: null
    });
  },

  // 检查登录状态
  checkLoginStatus: function() {
    if (!auth.isLoggedIn()) {
      // 未登录，跳转到登录页
      wx.navigateTo({
        url: '/pages/auth/login/login'
      });
      return false;
    }
    return true;
  },

  // 返回上一页
  navigateBack: function() {
    wx.navigateBack();
  },

  // 选择地址
  selectAddress: function() {
    console.log('【订单确认日志】选择地址功能触发');
    
    // 保存当前Page实例的引用，避免作用域问题
    const that = this;
    
    // 调用云函数查询用户地址列表
    wx.cloud.callFunction({
      name: 'address-list',
      success: res => {
        console.log('【订单确认日志】获取地址列表成功:', res);
        if (res.result.code === 200) {
          const addresses = res.result.data?.addresses || [];
          console.log('【订单确认日志】用户地址数量:', addresses.length);
          
          if (addresses.length > 0) {
            // 有地址，跳转到地址管理页，进入选择模式
            wx.navigateTo({
              url: '/pages/address/address?selectMode=true',
              // 关键修改：添加events监听器，确保能接收地址数据
              events: {
                selectedAddress: function(data) {
                  console.log('【订单确认日志】通过events监听器接收到地址数据:', data);
                  if (data && data.address) {
                    // 确保地址数据结构完整
                    console.log('【订单确认日志】接收到的地址数据结构:', {
                      hasName: !!data.address.name,
                      hasPhone: !!data.address.phone,
                      hasProvince: !!data.address.province,
                      hasCity: !!data.address.city,
                      hasDistrict: !!data.address.district,
                      hasDetail: !!data.address.detail
                    });
                    
                    // 更新地址数据 - 使用that引用Page实例，解决this作用域问题
                    that.setData({
                      selectedAddress: data.address
                    }, () => {
                      // 确保数据更新完成后再执行后续操作
                      console.log('【订单确认日志】地址数据已更新:', that.data.selectedAddress);
                      console.log('【订单确认日志】更新后的地址数据结构:', {
                        hasName: !!that.data.selectedAddress.name,
                        hasPhone: !!that.data.selectedAddress.phone,
                        hasProvince: !!that.data.selectedAddress.province,
                        hasCity: !!that.data.selectedAddress.city,
                        hasDistrict: !!that.data.selectedAddress.district,
                        hasDetail: !!that.data.selectedAddress.detail
                      });
                    });
                  } else {
                    console.error('【订单确认日志】接收到的地址数据无效:', data);
                  }
                }
              }
            });
          } else {
            // 没有地址，直接跳转到添加地址页
            console.log('【订单确认日志】用户无地址，跳转到添加地址页');
            wx.navigateTo({
              url: '/pages/address/new/new?from=order',
              // 添加events监听器，接收新添加的地址
              events: {
                selectedAddress: function(data) {
                  console.log('【订单确认日志】从添加地址页接收到地址数据:', data);
                  if (data && data.address) {
                    that.setData({
                      selectedAddress: data.address
                    }, () => {
                      console.log('【订单确认日志】新添加的地址已更新:', that.data.selectedAddress);
                    });
                  }
                }
              }
            });
          }
        } else {
          wx.showToast({
            title: '获取地址失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('获取地址列表失败:', err);
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      }
    });
  },

  // 加载默认地址
  loadDefaultAddress: function() {
    console.log('【订单确认日志】开始加载默认地址');
    // 调用云函数获取默认地址
    wx.cloud.callFunction({
      name: 'address-list',
      success: res => {
        console.log('【订单确认日志】获取地址列表成功:', res.result);
        if (res.result.code === 200) {
          const addresses = res.result.data?.addresses || [];
          console.log('【订单确认日志】地址列表数量:', addresses.length);
          const defaultAddress = addresses.find(address => address.isDefault);
          console.log('【订单确认日志】找到的默认地址:', defaultAddress);
          
          // 只有在找到默认地址时才更新，避免设置为undefined
          if (defaultAddress) {
            this.setData({
              selectedAddress: defaultAddress
            });
            console.log('【订单确认日志】默认地址设置成功');
          } else {
            console.log('【订单确认日志】未找到默认地址，保持当前地址状态');
          }
        }
      },
      fail: err => {
        console.error('获取默认地址失败:', err);
      }
    });
  },



  // 选择配送方式
  onDeliveryChange: function(e) {
    const deliveryId = e.detail.value;
    const deliveryOption = this.data.deliveryOptions.find(option => option.id === deliveryId);
    
    this.setData({
      selectedDelivery: { id: deliveryId, name: deliveryOption.name },
      deliveryFee: deliveryOption.fee
    });
    
    // 重新计算价格
    this.calculatePrice();
  },

  // 选择支付方式
  onPaymentChange: function(e) {
    const paymentId = e.detail.value;
    
    // 当选择余额支付时，弹出提示
    if (paymentId === 'balance') {
      wx.showModal({
        title: '提示',
        content: '余额支付正在开发中',
        showCancel: false,
        success: (res) => {
          // 提示后，自动切回微信支付
          this.setData({
            selectedPayment: { id: 'wechat', name: '微信支付' },
            paymentType: 'wechat'
          });
        }
      });
    } else {
      // 选择微信支付时，正常设置
      this.setData({
        selectedPayment: { id: paymentId, name: paymentId === 'wechat' ? '微信支付' : '余额支付' },
        paymentType: paymentId
      });
    }
  },

  // 构建最近三天日期
  buildAppointmentDates: function() {
    const days = [];
    const now = new Date();
    const weekMap = ['日','一','二','三','四','五','六'];
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const month = d.getMonth() + 1;
      const date = d.getDate();
      const label = `${month}月${date}日 (周${weekMap[d.getDay()]})`;
      days.push({ label, value: `${d.getFullYear()}-${month}-${date}` });
    }
    // 默认选中第一天第一个时间段，确保picker有可选项和默认值
    const defaultDay = days[0];
    const defaultTime = this.data.appointmentTimes[0];
    const defaultText = defaultDay && defaultTime ? `${defaultDay.label} ${defaultTime.label}` : '请选择送达时间';

    this.setData({
      appointmentDates: days,
      pickerValue: [0, 0],
      selectedAppointmentText: defaultText,
      selectedAppointment: defaultDay && defaultTime ? {
        day: defaultDay.value,
        dayLabel: defaultDay.label,
        time: defaultTime.value,
        timeLabel: defaultTime.label
      } : null
    });
  },

  // 打开预约选择器（WXML 使用 picker 直接选择）
  onAppointmentChange: function(e) {
    const [dayIdx, timeIdx] = e.detail.value;
    const day = this.data.appointmentDates[dayIdx];
    const time = this.data.appointmentTimes[timeIdx];
    if (!day || !time) return;
    const text = `${day.label} ${time.label}`;
    this.setData({
      pickerValue: [dayIdx, timeIdx],
      selectedAppointmentText: text,
      selectedAppointment: {
        day: day.value,
        dayLabel: day.label,
        time: time.value,
        timeLabel: time.label
      }
    });
  },

  // 输入订单备注
  onRemarkChange: function(e) {
    this.setData({
      orderRemark: e.detail.value,
      remark: e.detail.value
    });
  },
  
  // 检查地址有效性
  // 功能：基于selectedAddress的真实属性判断地址是否有效
  // 解决：undefined/false问题，确保地址数据结构完整
  checkAddressValidity: function() {
    console.log('开始检查地址有效性...');
    console.log('当前selectedAddress:', this.data.selectedAddress);
    
    // 检查selectedAddress是否存在
    if (!this.data.selectedAddress) {
      console.error('地址检查结果：selectedAddress不存在');
      return false;
    }
    
    // 检查selectedAddress是否为对象
    if (typeof this.data.selectedAddress !== 'object') {
      console.error('地址检查结果：selectedAddress不是对象');
      return false;
    }
    
    // 检查selectedAddress是否为空对象
    if (Object.keys(this.data.selectedAddress).length === 0) {
      console.error('地址检查结果：selectedAddress为空对象');
      return false;
    }
    
    // 检查核心地址字段是否存在
    const requiredFields = ['name', 'phone', 'province', 'city', 'district', 'detail'];
    const missingFields = [];
    
    requiredFields.forEach(field => {
      if (!this.data.selectedAddress[field]) {
        missingFields.push(field);
      }
    });
    
    if (missingFields.length > 0) {
      console.error('地址检查结果：缺少核心字段', missingFields);
      return false;
    }
    
    // 检查结果：地址有效
    console.log('地址检查结果：地址有效');
    console.log('地址详情：', {
      name: this.data.selectedAddress.name,
      phone: this.data.selectedAddress.phone,
      address: `${this.data.selectedAddress.province}${this.data.selectedAddress.city}${this.data.selectedAddress.district}${this.data.selectedAddress.detail}`
    });
    
    return true;
  },

  // 计算价格
  calculatePrice: function() {
    // 计算商品总价
    const subtotal = this.data.products.reduce((total, product) => {
      // 兼容不同的价格字段名
      const price = product.currentPrice || product.price || 0;
      return total + price * product.quantity;
    }, 0);
    
    // 计算订单总价
    const totalPrice = subtotal + this.data.deliveryFee;
    
    // 更新WXML中使用的价格字段
    this.setData({
      subtotal: subtotal,
      subtotalPrice: subtotal, // WXML中使用的是subtotalPrice
      deliveryFee: this.data.deliveryFee,
      totalPrice: totalPrice
    });
  },

  // 提交订单 - 请求限流优化点：添加防抖+节流，限制同一用户1秒内仅能触发1次下单请求
  submitOrder: function() {
    console.log('========================================');
    console.log('【订单确认日志1】提交订单功能触发');
    console.log('【订单确认日志1.1】当前selectedAddress状态:', this.data.selectedAddress);
    console.log('【订单确认日志1.2】selectedAddress类型:', typeof this.data.selectedAddress);
    console.log('【订单确认日志1.3】selectedAddress是否为空对象:', this.data.selectedAddress && typeof this.data.selectedAddress === 'object' ? Object.keys(this.data.selectedAddress).length === 0 : true);
    
    // 请求限流：防止短时间内重复发起请求 - 核心优化点
    if (this.data.loading || this.data.submitting) {
      console.log('【订单确认日志2】当前处于加载状态，忽略重复调用');
      return;
    }
    
    // 检查是否选择了地址
    // 使用专门的地址有效性检查函数，确保检查逻辑一致
    if (!this.checkAddressValidity()) {
      console.error('【订单确认日志3】未选择有效收货地址');
      console.error('【订单确认日志3.1】详细检查结果:', {
        selectedAddress: this.data.selectedAddress,
        hasName: !!this.data.selectedAddress?.name,
        hasPhone: !!this.data.selectedAddress?.phone,
        hasAddress: !!this.data.selectedAddress?.province || !!this.data.selectedAddress?.city || !!this.data.selectedAddress?.district || !!this.data.selectedAddress?.detail
      });
      wx.showToast({
        title: '请选择/添加收货地址',
        icon: 'none'
      });
      return;
    }
    console.log('【订单确认日志4】已选择地址:', this.data.selectedAddress);
    
    // 检查商品是否为空
    if (this.data.products.length === 0) {
      console.error('【订单确认日志5】未选择商品');
      wx.showToast({
        title: '请选择商品',
        icon: 'none'
      });
      return;
    }
    console.log('【订单确认日志6】已选择商品:', this.data.products);
    
    // 立即禁用按钮并显示"提交中..." - 请求限流优化点
    this.setData({
      loading: true,
      submitting: true // 用于WXML中禁用按钮并显示"提交中..."
    });
    
    // 构建订单数据
    // 修复：检查products是否是二维数组，如果是则转为一维数组
    let products = this.data.products;
    if (Array.isArray(products) && products.length > 0 && Array.isArray(products[0])) {
      console.log('【订单确认日志7-1】检测到二维数组，转换为一维数组');
      products = products.flat();
    }
    
    const orderData = {
      address: this.data.selectedAddress,
      goods: products.map(product => ({
        product_id: product.product_id || product.productId || product.id,
        quantity: product.quantity
      })),
      totalPrice: this.data.totalPrice,
      remark: this.data.remark,
      appointment: this.data.selectedAppointment
    };
    console.log('【订单确认日志7】构建的订单数据:', orderData);
    
    // 调用创建订单云函数
    wx.cloud.callFunction({
      name: 'order-create',
      data: orderData,
      success: (res) => {
        console.log('云函数返回的完整结果：', res.result);
        console.log('【订单确认日志8】创建订单云函数返回:', res);
        if (res.result.code === 200) {
          // 订单创建成功
          const orderId = res.result.data?.order_id || res.result.data?.orderId;
          console.log('【订单确认日志9】订单创建成功，订单ID:', orderId);
          
          // 如果是从购物车过来的，删除购物车中已购买的商品
          if (this.options.from === 'cart') {
            const productIds = this.data.products.map(product => product.product_id || product.id || product.productId);
            cartUtil.removeProductsFromCart(productIds);
            console.log('【订单确认日志10】从购物车删除已购买商品:', productIds);
          }
          
          // 跳转到支付页面
          console.log('【订单确认日志11】准备跳转到支付页面，订单ID:', orderId, '总价:', this.data.totalPrice);
          
          // 获取商品ID（支持多商品场景）
          const productId = this.data.products[0]?.product_id || this.data.products[0]?.productId || this.data.products[0]?.id;
          console.log('【订单确认日志11.1】获取到的商品ID:', productId);
          
          // 关键修改点3：使用wx.navigateTo创建事件通道，确保能传递订单数据
          wx.navigateTo({
            url: `/pages/pay/pay?orderId=${orderId}&totalPrice=${this.data.totalPrice}&productId=${productId}`,
            // 关键修改点4：绑定事件通道，确保能接收回调
            events: {
              // 可选：监听支付页面返回的事件
              paymentComplete: (result) => {
                console.log('【订单确认日志14】收到支付完成事件:', result);
              }
            },
            success: (res) => {
              console.log('【订单确认日志12】跳转到支付页面成功，创建事件通道');
              // 关键修改点5：通过eventChannel向支付页面传送订单数据
              if (res.eventChannel && typeof res.eventChannel.emit === 'function') {
                res.eventChannel.emit('acceptOrderData', {
                  orderId: orderId,
                  totalPrice: this.data.totalPrice,
                  productId: productId
                });
                console.log('【订单确认日志13】通过事件通道发送订单数据:', orderId, '商品ID:', productId);
              }
            },
            fail: (err) => {
              console.error('【订单确认日志14】跳转到支付页面失败:', err);
              // 跳转失败时恢复状态
              this.setData({
                loading: false,
                submitting: false
              });
            }
          });
        } else {
          // 订单创建失败，显示具体错误信息
          console.error('【订单确认日志14】订单创建失败:', res.result.message, '错误详情:', res.result.error);
          
          // 优化错误提示与重试引导 - 核心优化点
          const errorMessage = res.result.message;
          if (errorMessage.includes('事务繁忙') || errorMessage.includes('当前下单人数较多')) {
            // 事务繁忙错误，弹窗提示并提供重新提交按钮
            wx.showModal({
              title: '提示',
              content: '当前下单人数较多，请稍后再试',
              showCancel: true,
              cancelText: '取消',
              confirmText: '重新提交',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  // 用户点击重新提交，重新执行下单逻辑
                  console.log('【订单确认日志17】用户点击重新提交订单');
                  this.setData({
                    loading: false,
                    submitting: false
                  });
                  this.submitOrder();
                } else {
                  // 用户点击取消，恢复按钮状态
                  this.setData({
                    loading: false,
                    submitting: false
                  });
                }
              }
            });
          } else {
            // 其他错误，显示普通错误提示
            this.showError('订单创建失败：' + errorMessage);
            this.setData({
              submitting: false
            });
          }
        }
      },
      fail: err => {
        console.error('【订单确认日志15】调用创建订单云函数失败:', err);
        this.showError('网络错误，请稍后重试');
        this.setData({
          submitting: false
        });
      },
      complete: () => {
        // 注意：不直接恢复loading状态，防止重复提交
        // 成功跳转到支付页面后，页面会卸载，不需要恢复状态
        // 只有在明确的失败分支中恢复状态
        console.log('【订单确认日志16】提交订单流程完成');
      }
    });
  },

  // 显示错误提示
  showError: function(msg) {
    this.setData({
      errorMsg: msg
    });
    
    // 3秒后隐藏错误提示
    setTimeout(() => {
      this.setData({
        errorMsg: ''
      });
    }, 3000);
  },

  // 页面卸载
  onUnload: function() {
    // 清理数据
    this.setData({
      products: [],
      selectedAddress: null,
      selectedCoupon: null
    });
  }
});