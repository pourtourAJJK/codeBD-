// 云函数统一返回封装工具（product-detail 本地副本）

const normalizeMessage = (payload) => {
  if (!payload || typeof payload !== 'object') return '';
  return payload.message || payload.msg || payload.errMsg || payload.errmsg || '';
};

const normalizeData = (data) => {
  if (data === undefined || data === null) return {};
  return data;
};

const response = (code = 200, data = {}, message = '') => {
  return {
    code,
    data: normalizeData(data),
    message: message || ''
  };
};

const success = (data = {}, message = '') => response(200, data, message);
const fail = (message = '失败', data = {}) => response(500, data, message);
const unauthorized = (message = '未登录', data = {}) => response(401, data, message);

const normalize = (payload) => {
  // HTTP 回调类结果（保持原样）
  if (payload && typeof payload === 'object' && 'statusCode' in payload && 'body' in payload) {
    return payload;
  }

  // 已经是标准结构
  if (payload && typeof payload === 'object' && 'code' in payload && 'data' in payload && 'message' in payload) {
    return response(payload.code, payload.data, payload.message);
  }

  // success 结构
  if (payload && typeof payload === 'object' && 'success' in payload) {
    const isOk = !!payload.success;
    const message = normalizeMessage(payload);
    if (isOk) {
      return success(payload.data ?? {}, message);
    }

    // 判断未登录
    if (message.includes('未登录') || payload.code === 401) {
      return unauthorized(message || '未登录', payload.data ?? {});
    }

    return fail(message || '失败', payload.data ?? {});
  }

  // code 结构
  if (payload && typeof payload === 'object' && 'code' in payload) {
    const rawCode = payload.code;
    const message = normalizeMessage(payload);
    if (rawCode === 200 || rawCode === 0) {
      return success(payload.data ?? {}, message);
    }
    if (rawCode === 401) {
      return unauthorized(message || '未登录', payload.data ?? {});
    }
    return fail(message || '失败', payload.data ?? {});
  }

  // 兜底
  if (payload === undefined || payload === null) {
    return success({}, '');
  }

  if (typeof payload === 'object') {
    return success(payload, '');
  }

  return success({ value: payload }, '');
};

const withResponse = (handler) => {
  return async (...args) => {
    try {
      const result = await handler(...args);
      return normalize(result);
    } catch (error) {
      return fail(error?.message || '服务器异常');
    }
  };
};

module.exports = {
  response,
  success,
  fail,
  unauthorized,
  normalize,
  withResponse
};
