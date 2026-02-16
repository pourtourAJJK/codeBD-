// 订单跟踪页面逻辑
const dateUtil = require('../../utils/dateUtil.js');

Page({
  data: {
    orderId: '',
    orderInfo: {
      orderId: '',
      statusText: '',
      statusTime: ''
    },
    deliveryInfo: {
      eta: '30分钟',
      currentPosition: {
        longitude: 0,
        latitude: 0
      },
      steps: [],
      courier: {
        name: '',
        phone: '',
        avatar: ''
      }
    },
    markers: [],
    polyline: [],
    loading: true,
    refreshInterval: null
  },

  onLoad: function (options) {
    // 获取订单ID
    if (options.orderId) {
      this.setData({
        orderId: options.orderId
      });
      // 加载配送信息
      this.loadDeliveryInfo();
      // 设置定时刷新
      this.setRefreshInterval();
    } else {
      wx.showToast({
        title: '订单ID不能为空',
        icon: 'none'
      });
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  onUnload: function () {
    // 清除定时刷新
    if (this.data.refreshInterval) {
      clearInterval(this.data.refreshInterval);
    }
  },

  // 设置定时刷新
  setRefreshInterval: function () {
    // 每30秒刷新一次配送位置
    const interval = setInterval(() => {
      this.loadDeliveryInfo();
    }, 30000);
    
    this.setData({
      refreshInterval: interval
    });
  },

  // 加载配送信息
  loadDeliveryInfo: async function () {
    try {
      this.setData({
        loading: true
      });
      
      // 调用云函数获取配送信息
      const result = await wx.cloud.callFunction({
        name: 'delivery-getDeliveryInfo',
        data: {
          orderId: this.data.orderId
        }
      });
      
      if (result.result.success) {
        const deliveryData = result.result.deliveryInfo;
        
        // 更新配送信息
        this.setData({
          orderInfo: {
            orderId: this.data.orderId,
            statusText: deliveryData.orderStatusText,
            statusTime: dateUtil.formatDate(deliveryData.orderStatusTime, 'MM-dd HH:mm')
          },
          deliveryInfo: {
            eta: this.calculateETA(deliveryData.currentPosition, deliveryData.destination),
            currentPosition: deliveryData.currentPosition,
            steps: deliveryData.steps,
            courier: deliveryData.courier
          }
        });
        
        // 更新地图标记和路线
        this.updateMapData(deliveryData);
      } else {
        wx.showToast({
          title: '获取配送信息失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载配送信息失败', error);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  // 更新地图数据
  updateMapData: function (deliveryData) {
    const { storeLocation, currentPosition, destination } = deliveryData;
    
    // 地图标记
    const markers = [
      {
        id: 1,
        longitude: storeLocation.longitude,
        latitude: storeLocation.latitude,
        name: '取货点',
        iconPath: '/images/marker-store.png',
        width: 32,
        height: 32
      },
      {
        id: 2,
        longitude: currentPosition.longitude,
        latitude: currentPosition.latitude,
        name: '配送员',
        iconPath: '/images/marker-delivery.png',
        width: 32,
        height: 32
      },
      {
        id: 3,
        longitude: destination.longitude,
        latitude: destination.latitude,
        name: '收货点',
        iconPath: '/images/marker-destination.png',
        width: 32,
        height: 32
      }
    ];
    
    // 配送路线
    const polyline = [
      {
        points: [storeLocation, currentPosition, destination],
        color: '#ff6b6b',
        width: 3,
        dottedLine: false
      }
    ];
    
    this.setData({
      markers: markers,
      polyline: polyline
    });
  },

  // 计算预计到达时间
  calculateETA: function (currentPosition, destination) {
    // 模拟计算，实际应该根据地图API计算距离和时间
    // 这里简单返回30分钟
    return '30分钟';
  },

  // 联系配送员
  callCourier: function () {
    const phone = this.data.deliveryInfo.courier.phone;
    if (phone) {
      wx.makePhoneCall({
        phoneNumber: phone,
        success: function () {
          console.log('拨打电话成功');
        },
        fail: function (error) {
          console.error('拨打电话失败', error);
          wx.showToast({
            title: '拨打电话失败',
            icon: 'none'
          });
        }
      });
    } else {
      wx.showToast({
        title: '配送员电话为空',
        icon: 'none'
      });
    }
  },

  // 确认收货
  confirmReceipt: async function () {
    wx.showModal({
      title: '确认收货',
      content: '确定已经收到商品了吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 调用云函数确认收货
            const result = await wx.cloud.callFunction({
              name: 'order-confirm-receipt',
              data: {
                orderId: this.data.orderId
              }
            });
            
            if (result.result.code === 200) {
              wx.showToast({
                title: '确认收货成功',
                icon: 'success'
              });
              // 刷新页面数据
              this.loadDeliveryInfo();
            } else {
              wx.showToast({
                title: '确认收货失败',
                icon: 'none'
              });
            }
          } catch (error) {
            console.error('确认收货失败', error);
            wx.showToast({
              title: '网络错误',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 返回上一页
  navigateBack: function () {
    wx.navigateBack();
  }
});