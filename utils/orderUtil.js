/**
 * 订单工具类
 */
const orderUtil = {
  /**
   * 格式化订单时间（时间戳转字符串）
   * @param {number} time - 时间戳（毫秒）
   * @return {string} 格式化后的时间（如：2023-10-01 12:30）
   */
  formatOrderTime(time) {
    if (!time || typeof time !== 'number') {
      return '未知时间';
    }
    const date = new Date(time);
    const year = date.getFullYear();
    const month = this.padZero(date.getMonth() + 1);
    const day = this.padZero(date.getDate());
    const hours = this.padZero(date.getHours());
    const minutes = this.padZero(date.getMinutes());
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  /**
   * 数字补零（如：5 → "05"）
   * @param {number} num - 需补零的数字
   * @return {string} 补零后的字符串
   */
  padZero(num) {
    return num < 10 ? `0${num}` : `${num}`;
  },

  /**
   * 获取订单状态文本
   * @param {string|number} status - 订单状态标识
   * @return {string} 状态文本
   */
  getOrderStatusText(status) {
    // 状态映射：支持字符串和数字状态码
    const statusMap = {
      '0': '待支付',
      '1': '已支付',
      '2': '已发货',
      '3': '已完成',
      '4': '已取消',
      'pending': '待支付',
      'paid': '已支付',
      'shipped': '已发货',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    // 转换状态为字符串，确保能匹配
    const statusStr = String(status);
    return statusMap[statusStr] || '未知状态';
  },

  /**
   * 获取订单状态对应的颜色
   * @param {string|number} status - 订单状态标识
   * @return {string} 颜色值（如：#e74c3c）
   */
  getOrderStatusColor(status) {
    // 颜色映射：支持字符串和数字状态码
    const colorMap = {
      '0': '#e74c3c', // 待支付-红色
      '1': '#f39c12', // 已支付-橙色
      '2': '#3498db', // 已发货-蓝色
      '3': '#27ae60', // 已完成-绿色
      '4': '#95a5a6', // 已取消-灰色
      'pending': '#e74c3c', // 待支付-红色
      'paid': '#f39c12', // 已支付-橙色
      'shipped': '#3498db', // 已发货-蓝色
      'completed': '#27ae60', // 已完成-绿色
      'cancelled': '#95a5a6' // 已取消-灰色
    };
    // 转换状态为字符串，确保能匹配
    const statusStr = String(status);
    return colorMap[statusStr] || '#666'; // 未知状态-深灰
  }
};

module.exports = orderUtil;