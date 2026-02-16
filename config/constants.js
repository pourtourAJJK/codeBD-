/**
 * 常量定义
 */

// 订单状态常量
export const ORDER_STATUS = {
  PENDING_PAYMENT: 1,   // 待付款
  PENDING_DELIVERY: 2,  // 待配送
  DELIVERY_IN_PROGRESS: 3, // 配送中
  DELIVERED: 4,         // 已送达
  COMPLETED: 5,         // 已完成
  CANCELLED: 6,         // 已取消
  REFUNDED: 7           // 已退款
};

// 订单状态文本
export const ORDER_STATUS_TEXT = {
  [ORDER_STATUS.PENDING_PAYMENT]: '待付款',
  [ORDER_STATUS.PENDING_DELIVERY]: '待配送',
  [ORDER_STATUS.DELIVERY_IN_PROGRESS]: '配送中',
  [ORDER_STATUS.DELIVERED]: '已送达',
  [ORDER_STATUS.COMPLETED]: '已完成',
  [ORDER_STATUS.CANCELLED]: '已取消',
  [ORDER_STATUS.REFUNDED]: '已退款'
};

// 支付方式常量
export const PAYMENT_METHOD = {
  WECHAT_PAY: 1,  // 微信支付
  ALIPAY: 2,      // 支付宝支付
  BANK_TRANSFER: 3, // 银行转账
  CASH: 4         // 现金支付
};

// 支付方式文本
export const PAYMENT_METHOD_TEXT = {
  [PAYMENT_METHOD.WECHAT_PAY]: '微信支付',
  [PAYMENT_METHOD.ALIPAY]: '支付宝支付',
  [PAYMENT_METHOD.BANK_TRANSFER]: '银行转账',
  [PAYMENT_METHOD.CASH]: '现金支付'
};

// 支付状态常量
export const PAYMENT_STATUS = {
  UNPAID: 1,      // 未支付
  PAID: 2,         // 已支付
  REFUNDING: 3,    // 退款中
  REFUNDED: 4,     // 已退款
  FAILED: 5        // 支付失败
};

// 支付状态文本
export const PAYMENT_STATUS_TEXT = {
  [PAYMENT_STATUS.UNPAID]: '未支付',
  [PAYMENT_STATUS.PAID]: '已支付',
  [PAYMENT_STATUS.REFUNDING]: '退款中',
  [PAYMENT_STATUS.REFUNDED]: '已退款',
  [PAYMENT_STATUS.FAILED]: '支付失败'
};

// 商品分类常量
export const PRODUCT_CATEGORY = {
  WATER: 1,        // 水
  DRINKS: 2,       // 饮料
  SNACKS: 3,       // 零食
  DAILY_NEEDS: 4,  // 日用品
  OTHER: 99        // 其他
};

// 商品分类文本
export const PRODUCT_CATEGORY_TEXT = {
  [PRODUCT_CATEGORY.WATER]: '水',
  [PRODUCT_CATEGORY.DRINKS]: '饮料',
  [PRODUCT_CATEGORY.SNACKS]: '零食',
  [PRODUCT_CATEGORY.DAILY_NEEDS]: '日用品',
  [PRODUCT_CATEGORY.OTHER]: '其他'
};

// 性别常量
export const GENDER = {
  MALE: 1,     // 男
  FEMALE: 2,   // 女
  UNKNOWN: 0   // 未知
};

// 性别文本
export const GENDER_TEXT = {
  [GENDER.MALE]: '男',
  [GENDER.FEMALE]: '女',
  [GENDER.UNKNOWN]: '未知'
};

// 错误码常量
export const ERROR_CODE = {
  SUCCESS: 0,                 // 成功
  SYSTEM_ERROR: 10000,        // 系统错误
  PARAMETER_ERROR: 10001,     // 参数错误
  AUTHENTICATION_FAILED: 10002, // 认证失败
  PERMISSION_DENIED: 10003,   // 权限不足
  RESOURCE_NOT_FOUND: 10004,  // 资源不存在
  DATA_CONFLICT: 10005,       // 数据冲突
  NETWORK_ERROR: 10006,       // 网络错误
  OPERATION_FAILED: 10007,    // 操作失败
  RATE_LIMIT_EXCEEDED: 10008, // 超过限流
  INVALID_REQUEST: 10009,     // 无效请求
  INTERNAL_ERROR: 10010       // 内部错误
};

// 错误消息常量
export const ERROR_MESSAGE = {
  [ERROR_CODE.SUCCESS]: '操作成功',
  [ERROR_CODE.SYSTEM_ERROR]: '系统错误，请稍后重试',
  [ERROR_CODE.PARAMETER_ERROR]: '参数错误，请检查输入',
  [ERROR_CODE.AUTHENTICATION_FAILED]: '认证失败，请重新登录',
  [ERROR_CODE.PERMISSION_DENIED]: '权限不足，无法操作',
  [ERROR_CODE.RESOURCE_NOT_FOUND]: '资源不存在',
  [ERROR_CODE.DATA_CONFLICT]: '数据冲突，请稍后重试',
  [ERROR_CODE.NETWORK_ERROR]: '网络错误，请检查网络连接',
  [ERROR_CODE.OPERATION_FAILED]: '操作失败，请稍后重试',
  [ERROR_CODE.RATE_LIMIT_EXCEEDED]: '请求过于频繁，请稍后重试',
  [ERROR_CODE.INVALID_REQUEST]: '无效的请求',
  [ERROR_CODE.INTERNAL_ERROR]: '内部错误，请稍后重试'
};

// 配送状态常量
export const DELIVERY_STATUS = {
  PENDING: 1,          // 待配送
  PICKED_UP: 2,        // 已取货
  DELIVERY_IN_PROGRESS: 3, // 配送中
  DELIVERED: 4,        // 已送达
  FAILED: 5            // 配送失败
};

// 配送状态文本
export const DELIVERY_STATUS_TEXT = {
  [DELIVERY_STATUS.PENDING]: '待配送',
  [DELIVERY_STATUS.PICKED_UP]: '已取货',
  [DELIVERY_STATUS.DELIVERY_IN_PROGRESS]: '配送中',
  [DELIVERY_STATUS.DELIVERED]: '已送达',
  [DELIVERY_STATUS.FAILED]: '配送失败'
};

// 优惠券状态常量
export const COUPON_STATUS = {
  AVAILABLE: 1,  // 可用
  USED: 2,       // 已使用
  EXPIRED: 3     // 已过期
};

// 优惠券状态文本
export const COUPON_STATUS_TEXT = {
  [COUPON_STATUS.AVAILABLE]: '可用',
  [COUPON_STATUS.USED]: '已使用',
  [COUPON_STATUS.EXPIRED]: '已过期'
};

// 优惠券类型常量
export const COUPON_TYPE = {
  DISCOUNT: 1,        // 折扣券
  FULL_REDUCTION: 2,  // 满减券
  CASH: 3             // 现金券
};

// 优惠券类型文本
export const COUPON_TYPE_TEXT = {
  [COUPON_TYPE.DISCOUNT]: '折扣券',
  [COUPON_TYPE.FULL_REDUCTION]: '满减券',
  [COUPON_TYPE.CASH]: '现金券'
};

// 存储键名常量
export const STORAGE_KEY = {
  USER_INFO: 'userInfo',               // 用户信息
  TOKEN: 'token',                      // 令牌
  ADDRESS_LIST: 'addressList',         // 地址列表
  DEFAULT_ADDRESS: 'defaultAddress',   // 默认地址
  RECENT_SEARCHES: 'recentSearches',   // 最近搜索
  SHOPPING_CART: 'shoppingCart',       // 购物车
  ORDER_LIST: 'orderList',             // 订单列表
  COUPON_LIST: 'couponList',           // 优惠券列表
  SETTINGS: 'settings'                 // 设置
};

// 网络请求超时时间 (毫秒)
export const REQUEST_TIMEOUT = 10000;

// 分页默认参数
export const PAGINATION = {
  DEFAULT_PAGE: 1,    // 默认页码
  DEFAULT_SIZE: 10    // 默认每页数量
};

// 正则表达式常量
export const REGEX = {
  PHONE: /^1[3-9]\d{9}$/,              // 手机号
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // 邮箱
  ID_CARD: /^\d{17}[\dXx]$/,          // 身份证号
  CHINESE_NAME: /^[\u4e00-\u9fa5]{2,8}$/, // 中文姓名
  POSTAL_CODE: /^\d{6}$/,              // 邮政编码
  PRICE: /^\d+(\.\d{1,2})?$/         // 价格（最多两位小数）
};

// 地图相关常量
export const MAP = {
  DEFAULT_ZOOM: 16,   // 默认缩放级别
  MARKER_SIZE: 20,    // 标记大小
  DEFAULT_CENTER: {   // 默认中心点（北京）
    latitude: 39.9042,
    longitude: 116.4074
  }
};

module.exports = {
  ORDER_STATUS,
  ORDER_STATUS_TEXT,
  PAYMENT_METHOD,
  PAYMENT_METHOD_TEXT,
  PAYMENT_STATUS,
  PAYMENT_STATUS_TEXT,
  PRODUCT_CATEGORY,
  PRODUCT_CATEGORY_TEXT,
  GENDER,
  GENDER_TEXT,
  ERROR_CODE,
  ERROR_MESSAGE,
  DELIVERY_STATUS,
  DELIVERY_STATUS_TEXT,
  COUPON_STATUS,
  COUPON_STATUS_TEXT,
  COUPON_TYPE,
  COUPON_TYPE_TEXT,
  STORAGE_KEY,
  REQUEST_TIMEOUT,
  PAGINATION,
  REGEX,
  MAP
};