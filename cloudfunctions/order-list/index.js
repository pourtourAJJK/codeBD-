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

    const { status = 'all', page = 1, pageSize = 10 } = event;
    const pageIndex = Math.max(1, Number(page) || 1);
    const limit = Math.min(Math.max(Number(pageSize) || 10, 1), 50);
    const skip = (pageIndex - 1) * limit;

    let query = { openid };
    if (status && status !== 'all') {
      query = { ...query, status };
    }

    const [listRes, countRes] = await Promise.all([
      db.collection(ORDER_COLLECTION).where(query).orderBy('createTime', 'desc').skip(skip).limit(limit).get(),
      db.collection(ORDER_COLLECTION).where(query).count()
    ]);

    const orders = (listRes.data || []).map(order => {
      const goods = Array.isArray(order.goods) ? order.goods : [];

      return {
        ...order,
        goods
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
