/**
 * API接口配置
 */

// 云函数接口路径配置
const API = {
  // 用户相关
  USER_GET_INFO: 'user/getUserInfo',
  USER_UPDATE_INFO: 'user/updateUserInfo',
  USER_LOGOUT: 'user/logout',
  
  // 地址相关
  ADDRESS_GET_LIST: 'address/address-list',
  ADDRESS_ADD: 'address/address-create',
  ADDRESS_UPDATE: 'address/address-update',
  ADDRESS_DELETE: 'address/address-delete',
  
  // 优惠券相关
  COUPON_GET_LIST: 'coupon/getCoupons',
  COUPON_GET_AVAILABLE: 'coupon/getAvailableCoupons',
  COUPON_GET_USED: 'coupon/getUsedCoupons',
  COUPON_GET_EXPIRED: 'coupon/getExpiredCoupons',
  COUPON_RECEIVE: 'coupon/receiveCoupon',
  
  // 家庭成员相关
  FAMILY_GET_LIST: 'family/getFamilyMembers',
  FAMILY_ADD: 'family/addFamilyMember',
  FAMILY_UPDATE: 'family/updateFamilyMember',
  FAMILY_DELETE: 'family/deleteFamilyMember',
  
  // 订单相关
  ORDER_GET_LIST: 'order/order-list',
  ORDER_GET_DETAIL: 'order/order-get',
  ORDER_CREATE: 'order/order-create',
  ORDER_CANCEL: 'order/order-cancel',
  ORDER_CONFIRM_RECEIPT: 'order/order-confirm-receipt',
  
  // 支付相关
  PAY_CREATE_ORDER: 'pay/pay-create',
  PAY_QUERY_STATUS: 'pay/queryStatus',
  PAY_REFUND: 'pay/refund',
  
  // 配送相关
  DELIVERY_GET_INFO: 'delivery/getDeliveryInfo',
  DELIVERY_UPDATE_POSITION: 'delivery/updateDeliveryPosition',
  DELIVERY_GET_TRACK: 'delivery/getTrack',
  
  // 商品相关
  PRODUCT_GET_LIST: 'product/product-list',
  PRODUCT_GET_DETAIL: 'product/product-detail',
  PRODUCT_GET_CATEGORIES: 'product/getCategories',
  
  // 管理员相关
  ADMIN_LOGIN: 'admin/login',
  ADMIN_GET_STATISTICS: 'admin/getStatistics',
  ADMIN_UPDATE_ORDER_STATUS: 'admin/updateOrderStatus',
  ADMIN_GET_OPERATION_LOGS: 'admin/getOperationLogs',
  
  // 客服相关
  CUSTOMER_SERVICE_SEND_MESSAGE: 'customerService/sendMessage',
  CUSTOMER_SERVICE_GET_MESSAGES: 'customerService/getMessages'
};

// 请求方法配置
const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE'
};

// 超时时间设置 (毫秒)
const TIMEOUT = {
  DEFAULT: 10000, // 默认超时时间
  LONG: 30000,    // 长请求超时时间
  SHORT: 5000     // 短请求超时时间
};

module.exports = {
  API,
  HTTP_METHODS,
  TIMEOUT
};