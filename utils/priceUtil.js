/**
 * 价格计算工具函数
 */

/**
 * 格式化价格（分转元）
 * @param {number} price - 价格（单位：分）
 * @param {number} [decimal=2] - 小数位数
 * @returns {string} 格式化后的价格字符串
 */
export const formatPrice = (price, decimal = 2) => {
  if (typeof price !== 'number' || isNaN(price)) {
    return '0.00';
  }
  
  const yuanPrice = price / 100;
  return yuanPrice.toFixed(decimal);
};

/**
 * 价格转分（元转分）
 * @param {number|string} price - 价格（单位：元）
 * @returns {number} 转换后的价格（单位：分）
 */
export const priceToCent = (price) => {
  if (typeof price === 'string') {
    price = parseFloat(price);
  }
  
  if (typeof price !== 'number' || isNaN(price)) {
    return 0;
  }
  
  return Math.round(price * 100);
};

/**
 * 金额加法
 * @param {number|string} a - 第一个金额（单位：元）
 * @param {number|string} b - 第二个金额（单位：元）
 * @param {number} [decimal=2] - 小数位数
 * @returns {number} 相加后的金额（单位：元）
 */
export const addPrice = (a, b, decimal = 2) => {
  a = priceToCent(a);
  b = priceToCent(b);
  
  return parseFloat(((a + b) / 100).toFixed(decimal));
};

/**
 * 金额减法
 * @param {number|string} a - 被减数（单位：元）
 * @param {number|string} b - 减数（单位：元）
 * @param {number} [decimal=2] - 小数位数
 * @returns {number} 相减后的金额（单位：元）
 */
export const subtractPrice = (a, b, decimal = 2) => {
  a = priceToCent(a);
  b = priceToCent(b);
  
  return parseFloat(((a - b) / 100).toFixed(decimal));
};

/**
 * 金额乘法
 * @param {number|string} a - 第一个金额（单位：元）
 * @param {number|string} b - 第二个金额（单位：元）
 * @param {number} [decimal=2] - 小数位数
 * @returns {number} 相乘后的金额（单位：元）
 */
export const multiplyPrice = (a, b, decimal = 2) => {
  a = priceToCent(a);
  b = priceToCent(b);
  
  return parseFloat(((a * b) / 10000).toFixed(decimal));
};

/**
 * 金额除法
 * @param {number|string} a - 被除数（单位：元）
 * @param {number|string} b - 除数（单位：元）
 * @param {number} [decimal=2] - 小数位数
 * @returns {number} 相除后的金额（单位：元）
 */
export const dividePrice = (a, b, decimal = 2) => {
  if (parseFloat(b) === 0) {
    return 0;
  }
  
  a = priceToCent(a);
  b = priceToCent(b);
  
  return parseFloat(((a / b) * 100).toFixed(decimal));
};

/**
 * 计算折扣后的价格
 * @param {number|string} originalPrice - 原价（单位：元）
 * @param {number} discount - 折扣（如9.5表示95折）
 * @param {number} [decimal=2] - 小数位数
 * @returns {number} 折扣后的价格（单位：元）
 */
export const calculateDiscountPrice = (originalPrice, discount, decimal = 2) => {
  originalPrice = priceToCent(originalPrice);
  const discountPrice = Math.round(originalPrice * discount / 10);
  
  return parseFloat((discountPrice / 100).toFixed(decimal));
};

/**
 * 计算满减后的价格
 * @param {number|string} originalPrice - 原价（单位：元）
 * @param {number} fullAmount - 满减金额（满多少）
 * @param {number} reduceAmount - 减多少（单位：元）
 * @param {number} [decimal=2] - 小数位数
 * @returns {number} 满减后的价格（单位：元）
 */
export const calculateFullReductionPrice = (originalPrice, fullAmount, reduceAmount, decimal = 2) => {
  originalPrice = parseFloat(originalPrice);
  fullAmount = parseFloat(fullAmount);
  reduceAmount = parseFloat(reduceAmount);
  
  if (originalPrice < fullAmount) {
    return originalPrice.toFixed(decimal);
  }
  
  return subtractPrice(originalPrice, reduceAmount, decimal);
};

/**
 * 计算满减后的价格（支持多阶梯）
 * @param {number|string} originalPrice - 原价（单位：元）
 * @param {Array} rules - 满减规则数组，如[{full: 100, reduce: 20}, {full: 200, reduce: 50}]
 * @param {number} [decimal=2] - 小数位数
 * @returns {number} 满减后的价格（单位：元）
 */
export const calculateMultiFullReductionPrice = (originalPrice, rules, decimal = 2) => {
  originalPrice = parseFloat(originalPrice);
  
  if (!Array.isArray(rules) || rules.length === 0) {
    return originalPrice.toFixed(decimal);
  }
  
  // 按满减金额排序（从大到小）
  const sortedRules = [...rules].sort((a, b) => b.full - a.full);
  
  for (const rule of sortedRules) {
    if (originalPrice >= rule.full) {
      return calculateFullReductionPrice(originalPrice, rule.full, rule.reduce, decimal);
    }
  }
  
  return originalPrice.toFixed(decimal);
};

/**
 * 计算税费
 * @param {number|string} price - 价格（单位：元）
 * @param {number} taxRate - 税率（如0.13表示13%）
 * @param {number} [decimal=2] - 小数位数
 * @returns {number} 税费（单位：元）
 */
export const calculateTax = (price, taxRate, decimal = 2) => {
  price = parseFloat(price);
  taxRate = parseFloat(taxRate);
  
  if (isNaN(price) || isNaN(taxRate)) {
    return 0;
  }
  
  return parseFloat((price * taxRate).toFixed(decimal));
};

/**
 * 计算含税价格
 * @param {number|string} price - 不含税价格（单位：元）
 * @param {number} taxRate - 税率（如0.13表示13%）
 * @param {number} [decimal=2] - 小数位数
 * @returns {number} 含税价格（单位：元）
 */
export const calculatePriceWithTax = (price, taxRate, decimal = 2) => {
  price = parseFloat(price);
  taxRate = parseFloat(taxRate);
  
  if (isNaN(price) || isNaN(taxRate)) {
    return 0;
  }
  
  return parseFloat((price * (1 + taxRate)).toFixed(decimal));
};

/**
 * 格式化价格显示
 * @param {number|string} price - 价格（单位：元）
 * @param {string} [currencySymbol='¥'] - 货币符号
 * @param {number} [decimal=2] - 小数位数
 * @returns {string} 格式化后的价格字符串
 */
export const formatPriceDisplay = (price, currencySymbol = '¥', decimal = 2) => {
  const formattedPrice = formatPrice(price, decimal);
  return `${currencySymbol}${formattedPrice}`;
};

/**
 * 计算订单总金额
 * @param {Array} items - 商品项数组，每个项包含price和quantity
 * @param {number} [decimal=2] - 小数位数
 * @returns {number} 总金额（单位：元）
 */
export const calculateOrderTotal = (items, decimal = 2) => {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }
  
  let total = 0;
  
  for (const item of items) {
    if (item.price && item.quantity) {
      const itemPrice = parseFloat(item.price);
      const quantity = parseInt(item.quantity);
      
      if (!isNaN(itemPrice) && !isNaN(quantity)) {
        total = addPrice(total, itemPrice * quantity, decimal);
      }
    }
  }
  
  return total;
};

module.exports = {
  formatPrice,
  priceToCent,
  addPrice,
  subtractPrice,
  multiplyPrice,
  dividePrice,
  calculateDiscountPrice,
  calculateFullReductionPrice,
  calculateMultiFullReductionPrice,
  calculateTax,
  calculatePriceWithTax,
  formatPriceDisplay,
  calculateOrderTotal
};