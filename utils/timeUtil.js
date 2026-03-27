// utils/timeUtil.js
/**
 * 格式化数字：补0（如 9 → 09）
 */
const formatNumber = (n) => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

/**
 * 日期加时间（参考代码改造，适配你的项目）
 * @param {String/Number} date 日期字符串/时间戳
 * @param {Number} addDay 加天数
 * @returns 格式化后的日期字符串
 */
const getAddDateTime = (date, addDay = 0, addHour = 0, addMinute = 0, addSecond = 0) => {
  let timestamp = typeof date === 'number' ? date : Date.parse(date);
  // 处理iOS时间兼容：把-替换成/
  if (typeof date === 'string' && date.includes('-')) {
    timestamp = Date.parse(date.replace(/-/g, '/'));
  }
  let newTimestamp = timestamp + addDay * 24 * 60 * 60 * 1000;
  newTimestamp += addHour * 60 * 60 * 1000;
  newTimestamp += addMinute * 60 * 1000;
  newTimestamp += addSecond * 1000;
  let newDate = new Date(newTimestamp);
  const year = newDate.getFullYear();
  const month = newDate.getMonth() + 1;
  const day = newDate.getDate();
  const hour = newDate.getHours();
  const minute = newDate.getMinutes();
  const second = newDate.getSeconds();
  return [year, month, day].map(formatNumber).join('-') + ' ' + [hour, minute, second].map(formatNumber).join(':');
}

/**
 * 计算两个日期的时间差（毫秒数）
 * @param {Date} date1 结束时间
 * @param {Date} date2 当前时间
 * @returns 时间差（ms）
 */
const compareDate = (date1, date2) => {
  let tmp1 = date1.getTime();
  let tmp2 = date2.getTime();
  return tmp1 - tmp2;
}

/**
 * 格式化毫秒数为 分:秒 （如 29分39秒）
 * @param {Number} ms 毫秒数
 * @returns 格式化后的字符串
 */
const formatMsToMinSec = (ms) => {
  if (ms <= 0) return '0分钟0秒';
  const totalSecond = Math.floor(ms / 1000);
  const minute = formatNumber(Math.floor(totalSecond / 60));
  const second = formatNumber(totalSecond % 60);
  return `${minute}分钟${second}秒`;
}

module.exports = {
  formatNumber,
  getAddDateTime,
  compareDate,
  formatMsToMinSec
};