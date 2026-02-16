const cloud = require('wx-server-sdk');
const { withResponse } = require('./response.js');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const COLLECTION = 'shop_spu';
const CATEGORY_COLLECTION = 'shop_category';

const handler = async (event = {}) => {
  try {
    const {
      categoryCode = 'all',
      keyword = '',
      page = 1,
      pageSize = 10
    } = event;

    let whereCondition = { status: '1' };

    if (keyword) {
      const keywordRegex = db.RegExp({ regexp: keyword, options: 'i' });
      whereCondition = db.command.and([
        { status: '1' },
        db.command.or([
          { name: keywordRegex },
          { spec: keywordRegex },
          { detail: keywordRegex }
        ])
      ]);
    } else if (categoryCode !== 'all') {
      const categoryRes = await db.collection(CATEGORY_COLLECTION)
        .where({ code: categoryCode })
        .limit(1)
        .get();

      if (categoryRes.data && categoryRes.data.length > 0) {
        const categoryId = categoryRes.data[0]._id;
        whereCondition = { status: '1', category: categoryId };
      } else {
        whereCondition = { status: '1', _id: db.command.in([]) };
      }
    }

    const pageIndex = Math.max(1, Number(page) || 1);
    const limit = Math.min(Math.max(Number(pageSize) || 10, 1), 50);
    const skip = (pageIndex - 1) * limit;

    const [listRes, countRes] = await Promise.all([
      db.collection(COLLECTION).where(whereCondition).skip(skip).limit(limit).get(),
      db.collection(COLLECTION).where(whereCondition).count()
    ]);

    const products = (listRes.data || []).map(item => ({
      _id: item._id || '',
      productId: item._id || '',
      name: item.name || '未命名商品',
      spec: item.spec || '无规格',
      price: item.price || 0,
      cover_image: item.cover_image || '',
      detail: item.detail || '',
      tuwen_detail: item.tuwen_detail || '',
      stock: Number(item.stock) || 0,
      category: item.category || ''
    }));

    const total = countRes.total || 0;
    const hasMore = skip + products.length < total;

    return {
      code: 200,
      message: products.length ? '获取商品成功' : '未查询到符合条件的商品',
      data: {
        products,
        page: pageIndex,
        pageSize: limit,
        total,
        hasMore
      }
    };
  } catch (error) {
    console.error('获取商品列表失败:', error);
    return { code: 500, message: '获取商品列表失败', data: {} };
  }
};

exports.main = withResponse(handler);