/**
 * 微信支付 - 根据商户订单号查询订单
 */
const cloud = require('wx-server-sdk');
const { withResponse } = require('../../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 云函数入口函数
const handler = async (event, context) => {
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      name: 'wxpay_query_order_by_out_trade_no',
      data: {
        out_trade_no: '2024040118006666'
      }
    }
  });
  return res.result;
};

exports.main = withResponse(handler);
