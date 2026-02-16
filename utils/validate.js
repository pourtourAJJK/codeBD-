/**
 * 表单验证工具
 */

/**
 * 手机号验证
 * @param {string} phone - 手机号
 * @returns {boolean} 是否有效
 */
export const validatePhone = (phone) => {
  const reg = /^1[3-9]\d{9}$/;
  return reg.test(phone);
};

/**
 * 邮箱验证
 * @param {string} email - 邮箱
 * @returns {boolean} 是否有效
 */
export const validateEmail = (email) => {
  const reg = /^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/;
  return reg.test(email);
};

/**
 * 身份证验证
 * @param {string} idCard - 身份证号码
 * @returns {boolean} 是否有效
 */
export const validateIdCard = (idCard) => {
  const reg = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
  return reg.test(idCard);
};

/**
 * 金额验证
 * @param {string|number} amount - 金额
 * @returns {boolean} 是否有效
 */
export const validateAmount = (amount) => {
  // 允许整数或两位小数
  const reg = /^\d+(\.\d{1,2})?$/;
  return reg.test(amount.toString());
};

/**
 * 必填字段验证
 * @param {any} value - 要验证的值
 * @param {string} [fieldName] - 字段名称
 * @returns {boolean|string} 验证通过返回true，失败返回错误信息
 */
export const validateRequired = (value, fieldName = '该字段') => {
  if (value === null || value === undefined || value === '') {
    return `${fieldName}不能为空`;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return `${fieldName}不能为空`;
  }
  if (Array.isArray(value) && value.length === 0) {
    return `${fieldName}不能为空`;
  }
  if (typeof value === 'object' && Object.keys(value).length === 0) {
    return `${fieldName}不能为空`;
  }
  return true;
};

/**
 * 密码强度验证
 * @param {string} password - 密码
 * @returns {object} 包含验证结果和强度信息
 */
export const validatePassword = (password) => {
  let strength = 0;
  let message = '';
  
  // 长度验证
  if (password.length < 6) {
    message = '密码长度不能少于6位';
    return { valid: false, strength: 0, message };
  }
  if (password.length >= 10) {
    strength += 1;
  }
  
  // 包含数字
  if (/\d/.test(password)) {
    strength += 1;
  }
  
  // 包含小写字母
  if (/[a-z]/.test(password)) {
    strength += 1;
  }
  
  // 包含大写字母
  if (/[A-Z]/.test(password)) {
    strength += 1;
  }
  
  // 包含特殊字符
  if (/[^a-zA-Z0-9]/.test(password)) {
    strength += 1;
  }
  
  // 密码强度描述
  const strengthDescriptions = [
    { name: '弱', color: '#ff4d4f' },
    { name: '一般', color: '#faad14' },
    { name: '强', color: '#52c41a' },
    { name: '很强', color: '#1890ff' }
  ];
  
  const strengthInfo = strengthDescriptions[strength - 1] || strengthDescriptions[0];
  
  return {
    valid: true,
    strength,
    strengthText: strengthInfo.name,
    strengthColor: strengthInfo.color,
    message: ''
  };
};

/**
 * 验证两次密码是否一致
 * @param {string} password - 密码
 * @param {string} confirmPassword - 确认密码
 * @returns {boolean|string} 验证通过返回true，失败返回错误信息
 */
export const validateConfirmPassword = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    return '两次输入的密码不一致';
  }
  return true;
};

/**
 * 姓名验证
 * @param {string} name - 姓名
 * @returns {boolean|string} 验证通过返回true，失败返回错误信息
 */
export const validateName = (name) => {
  const result = validateRequired(name, '姓名');
  if (result !== true) {
    return result;
  }
  
  // 中文姓名或英文姓名
  const reg = /^[\u4e00-\u9fa5]{2,4}$|^[a-zA-Z\s]{2,20}$/;
  if (!reg.test(name)) {
    return '姓名格式不正确';
  }
  
  return true;
};

/**
 * 地址验证
 * @param {string} address - 地址
 * @returns {boolean|string} 验证通过返回true，失败返回错误信息
 */
export const validateAddress = (address) => {
  const result = validateRequired(address, '地址');
  if (result !== true) {
    return result;
  }
  
  if (address.length < 5) {
    return '地址信息不完整';
  }
  
  return true;
};

/**
 * 表单验证器
 * @param {Object} rules - 验证规则
 * @param {Object} data - 表单数据
 * @returns {object} 验证结果
 */
export const validateForm = (rules, data) => {
  const errors = {};
  let isValid = true;
  
  // 遍历验证规则
  for (const field in rules) {
    const fieldRules = rules[field];
    const value = data[field];
    
    // 遍历字段的所有验证规则
    for (const rule of fieldRules) {
      let result = true;
      
      // 必填验证
      if (rule.required) {
        result = validateRequired(value, rule.message || `${field}不能为空`);
      }
      
      // 验证通过且有其他验证规则
      if (result === true && value !== null && value !== undefined && value !== '') {
        // 手机号验证
        if (rule.type === 'phone') {
          if (!validatePhone(value)) {
            result = rule.message || '手机号格式不正确';
          }
        }
        
        // 邮箱验证
        else if (rule.type === 'email') {
          if (!validateEmail(value)) {
            result = rule.message || '邮箱格式不正确';
          }
        }
        
        // 身份证验证
        else if (rule.type === 'idCard') {
          if (!validateIdCard(value)) {
            result = rule.message || '身份证号码格式不正确';
          }
        }
        
        // 金额验证
        else if (rule.type === 'amount') {
          if (!validateAmount(value)) {
            result = rule.message || '金额格式不正确';
          }
        }
        
        // 长度验证
        else if (rule.min !== undefined || rule.max !== undefined) {
          const length = value.toString().length;
          if (rule.min !== undefined && length < rule.min) {
            result = rule.message || `长度不能少于${rule.min}个字符`;
          } else if (rule.max !== undefined && length > rule.max) {
            result = rule.message || `长度不能超过${rule.max}个字符`;
          }
        }
        
        // 正则验证
        else if (rule.pattern) {
          const reg = new RegExp(rule.pattern);
          if (!reg.test(value)) {
            result = rule.message || '格式不正确';
          }
        }
        
        // 自定义验证函数
        else if (rule.validator) {
          result = rule.validator(value, data);
        }
      }
      
      // 验证失败
      if (result !== true) {
        errors[field] = result;
        isValid = false;
        break; // 跳出当前字段的验证规则循环
      }
    }
  }
  
  return {
    valid: isValid,
    errors
  };
};

module.exports = {
  validatePhone,
  validateEmail,
  validateIdCard,
  validateAmount,
  validateRequired,
  validatePassword,
  validateConfirmPassword,
  validateName,
  validateAddress,
  validateForm
};