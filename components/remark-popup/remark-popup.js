Component({
  properties: {
    show: Boolean,
    defaultText: String
  },
  data: { text: "" },
  observers: {
    defaultText: function(n) { this.setData({ text: n || "" }) }
  },
  methods: {
    onInput(e) {
      // 🔥 安全过滤：只保留纯文本，杜绝特殊字符注入
      let val = e.detail.value.replace(/[<>'"\\]/g, '')
      this.setData({ text: val })
    },
    onCancel() { this.triggerEvent('cancel') },
    onConfirm() { this.triggerEvent('confirm', { text: this.data.text }) }
  }
})