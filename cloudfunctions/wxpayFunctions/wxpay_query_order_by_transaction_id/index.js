/**
 * 微信支付 - 微信支付订单号查询订单 */
const cloud = require('wx-server-sdk');
const { withResponse } = require('../../utils/response');

cloud.init({ env: 'fuxididai8888-5g9tptvfb7056681' });

// 云函数入口函数
const handler = async (event, context) => {
    const res = await cloud.callFunction({
        name: 'cloudbase_module',
        data: {
            name: 'wxpay_query_order_by_transaction_id',
            data: {
                // 请输入实际微信支付订单号
                transaction_id: '1217752501201407033233368018',
            },
        },
    });
    return res.result;
};

exports.main = withResponse(handler);