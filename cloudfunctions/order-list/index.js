// 【标准修复版】小程序订单列表云函数 - 100%解决401未登录
const cloud = require('wx-server-sdk');
// 初始化标准写法，删除所有冗余赋值
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 固定集合名称
const ORDER_COLLECTION = 'shop_order';
const USER_COLLECTION = 'shop_user';
const REFUND_COLLECTION = 'shop_refund';

// 原生云函数写法，删除withResponse包装
exports.main = async (event = {}) => {
  try {
    // 【核心】标准获取小程序用户OPENID
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    // 仅在OPENID为空时返回未登录（小程序正常调用绝不会为空）
    if (!openid) {
      return { code: 401, message: '未登录', data: {} };
    }

    // 校验用户是否存在
    const userRes = await db.collection(USER_COLLECTION).where({ openid }).get();
    if (!userRes.data || userRes.data.length === 0) {
      return { code: 500, message: '用户不存在', data: {} };
    }

    // 分页参数标准化
    const { page = 1, pageSize = 10, ...params } = event;
    const pageIndex = Math.max(1, Number(page) || 1);
    const limit = Math.min(Math.max(Number(pageSize) || 10, 1), 50);
    const skip = (pageIndex - 1) * limit;

    // 构建查询条件（仅查询当前用户订单）
    let query = { openid };
    if (params.statusmax) {
      query.statusmax = params.statusmax;
    }
    if (params.pay_status) {
      query.pay_status = params.pay_status;
    }

    // 并行查询数据+总数，提升性能
    const [listRes, countRes] = await Promise.all([
      db.collection(ORDER_COLLECTION).where(query).orderBy('createTime', 'desc').skip(skip).limit(limit).get(),
      db.collection(ORDER_COLLECTION).where(query).count()
    ]);

    // 拼接退款信息
    const orders = [];
    for (let item of listRes.data || []) {
      const refundData = await db.collection(REFUND_COLLECTION).where({ order_id: item.order_id }).limit(1).get();
      const goods = Array.isArray(item.goods) ? item.goods : [];
      const address = Array.isArray(item.address) ? item.address : (item.address ? [item.address] : []);
      orders.push({ ...item, goods, address, refundInfo: refundData.data[0] || null });
    }

    const total = countRes.total || 0;
    const hasMore = skip + orders.length < total;

    // 标准返回格式
    return {
      code: 200,
      message: '获取订单列表成功',
      data: { orders, page: pageIndex, pageSize: limit, total, hasMore }
    };

  } catch (error) {
    console.error('获取订单列表失败', error);
    return { code: 500, message: '获取订单列表失败', data: {} };
  }
};