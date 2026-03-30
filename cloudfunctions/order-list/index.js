const cloud = require('wx-server-sdk');
// 为避免部署遗漏公共utils，这里使用本地副本
const { withResponse } = require('./response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const wx = { cloud };
const db = wx.cloud.database();

const ORDER_COLLECTION = 'shop_order';
const USER_COLLECTION = 'shop_user';

const handler = async (event = {}) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return { code: 401, message: '未登录', data: {} };
    }

    const userRes = await db.collection(USER_COLLECTION).where({ openid }).get();
    if (!userRes.data || userRes.data.length === 0) {
      return { code: 500, message: '用户不存在', data: {} };
    }

    const { page = 1, pageSize = 10, ...params } = event;
    const pageIndex = Math.max(1, Number(page) || 1);
    const limit = Math.min(Math.max(Number(pageSize) || 10, 1), 50);
    const skip = (pageIndex - 1) * limit;

    let query = { openid };
    
    // 处理 statusmax（支持字符串 或 $in 数组查询）
    if (params.statusmax) {
      if (params.statusmax.$in) {
        // 适配待配送的多状态查询：{ statusmax: { $in: ["2", "3"] } }
        query.statusmax = db.command.in(params.statusmax.$in);
      } else {
        // 单状态查询：{ statusmax: "1" }
        query.statusmax = params.statusmax;
      }
    }

    // 处理 pay_status（支持字符串 "0"/"1"）
    if (params.pay_status) {
      query.pay_status = params.pay_status;
    }

    // 确保查询最新数据，不使用缓存
    const [listRes, countRes] = await Promise.all([
      db.collection(ORDER_COLLECTION).where(query).orderBy('createTime', 'desc').skip(skip).limit(limit).get({ forceServer: true }),
      db.collection(ORDER_COLLECTION).where(query).count({ forceServer: true })
    ]);

    const orders = (listRes.data || []).map(order => {
      const goods = Array.isArray(order.goods) ? order.goods : [];
      const address = Array.isArray(order.address) ? order.address : (order.address ? [order.address] : []);

      return {
        ...order,
        goods,
        address
      };
    });

    const total = countRes.total || 0;
    const hasMore = skip + orders.length < total;

    return {
      code: 200,
      message: '获取订单列表成功',
      data: {
        orders,
        page: pageIndex,
        pageSize: limit,
        total,
        hasMore
      }
    };
  } catch (error) {
    console.error('获取订单列表失败', error);
    return { code: 500, message: '获取订单列表失败', data: {} };
  }
};

exports.main = withResponse(handler);
