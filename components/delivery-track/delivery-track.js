// 配送跟踪组件逻辑
Component({
  // 组件的属性列表
  properties: {
    // 配送步骤数据
    steps: {
      type: Array,
      value: [],
      observer: function(newVal) {
        if (newVal && newVal.length > 0) {
          this.processSteps(newVal);
        }
      }
    },
    // 当前步骤ID
    currentStepId: {
      type: Number,
      value: 0
    },
    // 预计到达时间
    eta: {
      type: String,
      value: '30分钟'
    }
  },

  // 组件的初始数据
  data: {
    processedSteps: [],
    currentStatus: '',
    deliveryDuration: ''
  },

  // 组件的方法列表
  methods: {
    // 处理配送步骤数据
    processSteps: function(steps) {
      // 格式化时间
      const processedSteps = steps.map(step => {
        return {
          ...step,
          time: this.formatTime(step.time)
        };
      });
      
      // 获取当前状态
      const currentStep = processedSteps.find(step => step.id === this.data.currentStepId);
      const currentStatus = currentStep ? currentStep.status : '';
      
      // 计算配送时长
      const deliveryDuration = this.calculateDeliveryDuration(processedSteps);
      
      this.setData({
        processedSteps: processedSteps,
        currentStatus: currentStatus,
        deliveryDuration: deliveryDuration
      });
    },

    // 格式化时间
    formatTime: function(timeStr) {
      if (!timeStr) return '';
      
      const date = new Date(timeStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${month}-${day} ${hours}:${minutes}`;
    },

    // 计算配送时长
    calculateDeliveryDuration: function(steps) {
      if (!steps || steps.length === 0) return '0分钟';
      
      // 找到已接单和当前步骤的时间差
      const firstStep = steps.find(step => step.status === '已接单');
      const lastStep = steps.find(step => step.id === this.data.currentStepId) || steps[steps.length - 1];
      
      if (firstStep && lastStep) {
        const startTime = new Date(firstStep.time).getTime();
        const endTime = new Date(lastStep.time).getTime();
        const durationMinutes = Math.floor((endTime - startTime) / (1000 * 60));
        
        return `${durationMinutes}分钟`;
      }
      
      return '0分钟';
    },

    // 点击时间轴项目
    onTimelineItemClick: function(e) {
      const stepId = e.currentTarget.dataset.stepId;
      this.triggerEvent('stepclick', { stepId: stepId });
    }
  },

  // 生命周期函数
  lifetimes: {
    attached: function() {
      // 组件挂载时处理初始数据
      if (this.properties.steps && this.properties.steps.length > 0) {
        this.processSteps(this.properties.steps);
      }
    }
  },

  // 外部样式类
  externalClasses: ['custom-class']
});