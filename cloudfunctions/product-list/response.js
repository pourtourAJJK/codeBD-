const RESPONSE_CODE = {
  SUCCESS: 200,
  FAIL: 500,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
};

const withResponse = (handler) => async (event, context) => {
  try {
    const result = await handler(event, context);
    if (result && typeof result.code === 'number' && typeof result.message === 'string') {
      return result;
    }
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: '操作成功',
      data: result,
    };
  } catch (error) {
    console.error('云函数执行异常:', error);
    const errResponse = {
      code: RESPONSE_CODE.FAIL,
      message: error.message || '服务器内部错误',
    };
    if (process.env.DEBUG === 'true') {
      errResponse.stack = error.stack;
    }
    return errResponse;
  }
};

module.exports = {
  withResponse,
  RESPONSE_CODE,
};