/**
 * 微信支付 - 申请退款
 */
const cloud = require('wx-server-sdk');
const { withResponse } = require('../../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 云函数入口函数
const handler = async (event, context) => {
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      name: 'wxpay_refund',
      data: {
        transaction_id: '1217752501201407033233368018',
        out_refund_no: '2024040118006666',
        amount: {
          refund: 1,
          total: 1,
          currency: 'CNY'
        }
      }
    }
  });
  return res.result;
};

exports.main = withResponse(handler);
