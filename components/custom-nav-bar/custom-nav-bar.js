Component({
  properties: {
    navTitle: {
      type: String,
      value: '默认标题'
    },
    titleSize: {
      type: String,
      value: '18'
    },
    titleColor: {
      type: String,
      value: 'white'
    },
    bgColor: {
      type: String,
      value: '#2F8FC7'
    },
    // 是否展示位置选择区域
    showLocation: {
      type: Boolean,
      value: true
    },
    locationText: {
      type: String,
      value: '广东省清远市佛冈县...'
    }
  },

  data: {
    statusBarHeight: 0,
    navContentHeight: 44,
    navBarHeight: 0
  },

  lifetimes: {
    attached() {
      this.getSystemInfo();
    }
  },

  methods: {
    getSystemInfo() {
      const windowInfo = wx.getWindowInfo();
      const statusBarHeight = windowInfo.statusBarHeight;
      
      // 计算导航栏高度：状态栏高度 + 44px（导航栏内容高度）
      const navBarHeight = statusBarHeight + this.data.navContentHeight;
      
      this.setData({
        statusBarHeight,
        navBarHeight
      });
      
      // 将导航栏高度传递给父页面
      this.triggerEvent('navBarHeightReady', { navBarHeight });
    },
    
    onLocationClick() {
      this.triggerEvent('locationClick');
    }
  }
});