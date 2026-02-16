/**
 * 微信支付 - 退款查询
 */
const cloud = require('wx-server-sdk');
const { withResponse } = require('../../utils/response');

const { Wechatpay } = require('wechatpay-node-v3');

// 初始化云开发环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 微信支付配置（使用真实参数）
const payConfig = {
  appid: process.env.PAY_APPID,
  mchid: process.env.PAY_MCH_ID,
  privateKey: process.env.PAY_PRIVATE_KEY,
  serialNo: process.env.PAY_SERIAL_NO,
  apiV3Key: process.env.PAY_API_KEY
};

// 初始化微信支付实例
const pay = new Wechatpay(payConfig);

// 云函数入口函数
const handler = async (event, context) => {
  const db = cloud.database();
  
  try {
    // 1. 获取请求参数
    const { refund_id, out_refund_no, transaction_id, out_trade_no } = event;
    
    if (!refund_id && !out_refund_no && !transaction_id && !out_trade_no) {
      return {
        code: -1,
        msg: '缺少查询条件'
      };
    }
    
    // 2. 调用微信支付退款查询API
    const result = await pay.refund_query({
      refund_id: refund_id,
      out_refund_no: out_refund_no,
      transaction_id: transaction_id,
      out_trade_no: out_trade_no
    });
    
    // 3. 更新数据库中的退款状态
    if (result.out_refund_no && result.status) {
      await db.collection('shop_refund').where({
        out_refund_no: result.out_refund_no
      }).update({
        data: {
          status: result.status,
          updated_at: db.serverDate(),
          raw_data: result
        }
      });
      
      // 4. 更新订单的退款状态
      if (result.out_trade_no) {
        await db.collection('shop_order').where({
          out_trade_no: result.out_trade_no
        }).update({
          data: {
            refund_status: result.status,
            updated_at: db.serverDate()
          }
        });
      }
    }
    
    // 5. 返回结果
    return {
      code: 0,
      msg: '查询成功',
      data: result
    };
  } catch (error) {
    console.error('微信支付退款查询失败', error);
    return {
      code: -1,
      msg: '查询失败',
      error: error.message
    };
  }
};

exports.main = withResponse(handler);