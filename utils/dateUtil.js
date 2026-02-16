/**
 * 日期时间工具函数
 */

/**
 * 格式化日期时间
 * @param {Date|string|number} date - 日期对象、字符串或时间戳
 * @param {string} [format] - 格式化模板 (默认: yyyy-MM-dd HH:mm:ss)
 * @returns {string} 格式化后的日期时间字符串
 */
export const formatDate = (date, format = 'yyyy-MM-dd HH:mm:ss') => {
  // 转换为日期对象
  const d = new Date(date);
  
  // 检查日期是否有效
  if (isNaN(d.getTime())) {
    return '';
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const milliseconds = String(d.getMilliseconds()).padStart(3, '0');
  
  // 替换模板
  return format
    .replace('yyyy', year)
    .replace('MM', month)
    .replace('dd', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
    .replace('SSS', milliseconds);
};

/**
 * 计算时间差
 * @param {Date|string|number} startDate - 开始日期
 * @param {Date|string|number} endDate - 结束日期
 * @param {string} [unit] - 时间单位 (year, month, day, hour, minute, second)
 * @returns {number} 时间差
 */
export const calculateTimeDiff = (startDate, endDate, unit = 'day') => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  
  // 检查日期是否有效
  if (isNaN(start) || isNaN(end)) {
    return 0;
  }
  
  const diff = end - start;
  const seconds = Math.abs(diff / 1000);
  
  switch (unit) {
    case 'year':
      return Math.floor(seconds / (365 * 24 * 60 * 60));
    case 'month':
      return Math.floor(seconds / (30 * 24 * 60 * 60));
    case 'day':
      return Math.floor(seconds / (24 * 60 * 60));
    case 'hour':
      return Math.floor(seconds / (60 * 60));
    case 'minute':
      return Math.floor(seconds / 60);
    case 'second':
      return Math.floor(seconds);
    default:
      return Math.floor(seconds / (24 * 60 * 60)); // 默认返回天数
  }
};

/**
 * 生成时间段
 * @param {Date|string|number} startDate - 开始日期
 * @param {number} days - 天数
 * @returns {Array} 日期数组
 */
export const generateDateRange = (startDate, days) => {
  const start = new Date(startDate);
  const dates = [];
  
  // 检查日期是否有效
  if (isNaN(start.getTime())) {
    return dates;
  }
  
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date);
  }
  
  return dates;
};

/**
 * 计算倒计时
 * @param {Date|string|number} targetDate - 目标日期
 * @returns {Object} 倒计时对象 { days, hours, minutes, seconds, milliseconds, isExpired }
 */
export const calculateCountdown = (targetDate) => {
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  
  // 检查日期是否有效
  if (isNaN(target)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, milliseconds: 0, isExpired: true };
  }
  
  const diff = target - now;
  const isExpired = diff < 0;
  const absoluteDiff = Math.abs(diff);
  
  const days = Math.floor(absoluteDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absoluteDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absoluteDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absoluteDiff % (1000 * 60)) / 1000);
  const milliseconds = Math.floor(absoluteDiff % 1000);
  
  return {
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    isExpired
  };
};

/**
 * 获取今天的日期
 * @returns {Date} 今天的日期对象
 */
export const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/**
 * 获取昨天的日期
 * @returns {Date} 昨天的日期对象
 */
export const getYesterday = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday;
};

/**
 * 获取明天的日期
 * @returns {Date} 明天的日期对象
 */
export const getTomorrow = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
};

/**
 * 获取本周的开始日期 (周一)
 * @returns {Date} 本周开始日期
 */
export const getWeekStart = () => {
  const today = new Date();
  const day = today.getDay() || 7; // 将周日转换为7
  const diff = today.getDate() - day + 1;
  const weekStart = new Date(today.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

/**
 * 获取本周的结束日期 (周日)
 * @returns {Date} 本周结束日期
 */
export const getWeekEnd = () => {
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
};

/**
 * 获取本月的开始日期
 * @returns {Date} 本月开始日期
 */
export const getMonthStart = () => {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);
  return monthStart;
};

/**
 * 获取本月的结束日期
 * @returns {Date} 本月结束日期
 */
export const getMonthEnd = () => {
  const today = new Date();
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);
  return monthEnd;
};

/**
 * 判断是否是今天
 * @param {Date|string|number} date - 日期
 * @returns {boolean} 是否是今天
 */
export const isToday = (date) => {
  const d = new Date(date);
  const today = new Date();
  
  return d.getFullYear() === today.getFullYear() &&
         d.getMonth() === today.getMonth() &&
         d.getDate() === today.getDate();
};

/**
 * 判断是否是昨天
 * @param {Date|string|number} date - 日期
 * @returns {boolean} 是否是昨天
 */
export const isYesterday = (date) => {
  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return d.getFullYear() === yesterday.getFullYear() &&
         d.getMonth() === yesterday.getMonth() &&
         d.getDate() === yesterday.getDate();
};

/**
 * 判断是否是明天
 * @param {Date|string|number} date - 日期
 * @returns {boolean} 是否是明天
 */
export const isTomorrow = (date) => {
  const d = new Date(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return d.getFullYear() === tomorrow.getFullYear() &&
         d.getMonth() === tomorrow.getMonth() &&
         d.getDate() === tomorrow.getDate();
};

/**
 * 格式化相对时间
 * @param {Date|string|number} date - 日期
 * @returns {string} 相对时间字符串
 */
export const formatRelativeTime = (date) => {
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  
  // 检查日期是否有效
  if (isNaN(diff)) {
    return '';
  }
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return formatDate(date, 'MM-dd HH:mm');
  }
};

module.exports = {
  formatDate,
  calculateTimeDiff,
  generateDateRange,
  calculateCountdown,
  getToday,
  getYesterday,
  getTomorrow,
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  getMonthEnd,
  isToday,
  isYesterday,
  isTomorrow,
  formatRelativeTime
};