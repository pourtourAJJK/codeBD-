const cloud = require('wx-server-sdk');
const { withResponse } = require('../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const ORDER_COLLECTION = 'shop_order';

async function getWxpayConfig() {
  try {
    const configResult = await cloud.callFunction({ name: 'getSystemConfig' });
    if (!configResult || !configResult.result || configResult.result.code !== 200) {
      throw new Error(configResult?.result?.message || '支付配置获取失败');
    }
    const wxpayConfig = configResult.result.data?.wxpay;
    if (!wxpayConfig) {
      throw new Error('配置中缺少wxpay字段');
    }
    return wxpayConfig;
  } catch (error) {
    throw new Error(`获取微信支付配置失败：${error.message}`);
  }
}

const yuanToFen = (yuan) => Math.round(Number(yuan) * 100);

const generateOutTradeNo = (orderId) => {
  const prefix = 'trade_';
  const orderIdStr = String(orderId || '').replace(/[^A-Za-z0-9]/g, '');
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 8);
  return `${prefix}${orderIdStr}${timestamp}${random}`.slice(0, 32);
};

const handler = async (event = {}) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return { code: 401, message: '未登录', data: {} };
    }

    if (event.action === 'checkOrderExist') {
      const orderId = event.order_id || event.orderId;
      const orderRes = await db.collection(ORDER_COLLECTION)
        .where({ order_id: orderId, openid })
        .get();
      return {
        code: 200,
        message: '校验成功',
        data: { exist: (orderRes.data || []).length > 0 }
      };
    }

    const { amount, description } = event;
    const orderId = event.order_id || event.orderId;

    if (!orderId || amount === undefined || amount === null || !description) {
      return { code: 500, message: '缺少必要参数', data: {} };
    }

    const orderRes = await db.collection(ORDER_COLLECTION)
      .where({ order_id: orderId, openid })
      .limit(1)
      .get();

    if (!orderRes.data || orderRes.data.length === 0) {
      return { code: 500, message: '订单不存在或无权限', data: {} };
    }

    const order = orderRes.data[0];

    if (Number(order.pay_status) === 1) {
      return { code: 500, message: '订单已支付', data: {} };
    }

    const totalAmount = yuanToFen(amount);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return { code: 500, message: '支付金额不合法', data: {} };
    }

    await getWxpayConfig();

    let outTradeNo = order.out_trade_no || generateOutTradeNo(orderId);

    const existingRes = await db.collection(ORDER_COLLECTION)
      .where({ out_trade_no: outTradeNo })
      .get();
    if (existingRes.data.length > 0 && (!order.out_trade_no || order.out_trade_no !== outTradeNo)) {
      outTradeNo = generateOutTradeNo(orderId);
    }

    const wxpayResult = await cloud.callFunction({
      name: 'wxpayFunctions',
      data: {
        type: 'create_payment_order',
        description,
        out_trade_no: outTradeNo,
        amount: totalAmount,
        openid,
        trade_type: 'JSAPI'
      }
    });

    if (!wxpayResult.result || wxpayResult.result.code !== 200) {
      throw new Error(wxpayResult.result?.message || '微信统一下单失败');
    }

    const payData = wxpayResult.result.data;

    await db.collection(ORDER_COLLECTION)
      .where({ order_id: orderId, openid })
      .update({
        data: {
          out_trade_no: outTradeNo,
          pay_status: 0,
          status: 'pending',
          payData,
          paymentAmount: totalAmount,
          paymentTime: db.serverDate(),
          updatedAt: db.serverDate()
        }
      });

    return {
      code: 200,
      message: '微信支付订单创建成功',
      data: {
        payData,
        orderId,
        out_trade_no: outTradeNo,
        totalAmount
      }
    };
  } catch (error) {
    console.error('创建支付订单失败', error);
    return { code: 500, message: '创建支付订单失败', data: {} };
  }
};

exports.main = withResponse(handler);
