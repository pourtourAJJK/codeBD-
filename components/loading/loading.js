// 加载组件逻辑
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示加载动画
    visible: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {

  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 显示加载动画
    show() {
      this.setData({
        visible: true
      });
    },
    
    // 隐藏加载动画
    hide() {
      this.setData({
        visible: false
      });
    }
  }
})