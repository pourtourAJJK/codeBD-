const cloud = require('wx-server-sdk');
const { withResponse } = require('../utils/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const COLLECTION = 'shop_spu';

async function replaceCloudFileUrls(html = '') {
  if (!html) return '';
  const cloudFileIdRegex = /cloud:\/\/[^"']+/g;
  const cloudFileIds = html.match(cloudFileIdRegex) || [];

  if (cloudFileIds.length === 0) return html;

  try {
    const tempRes = await cloud.getTempFileURL({ fileList: cloudFileIds });
    const fileMap = {};
    (tempRes.fileList || []).forEach(file => {
      if (file.fileID && file.status === 0 && file.tempFileURL) {
        fileMap[file.fileID] = file.tempFileURL;
      }
    });

    return html.replace(cloudFileIdRegex, (fileId) => fileMap[fileId] || fileId);
  } catch (error) {
    console.error('富文本图片转换失败', error);
    return html;
  }
}

const handler = async (event = {}) => {
  try {
    const productId = event.id || event.productId;
    if (!productId) {
      return { code: 500, message: '缺少商品ID参数', data: {} };
    }

    const productRes = await db.collection(COLLECTION).where({ _id: productId }).get();
    const product = productRes.data[0];

    if (!product) {
      return { code: 500, message: '商品不存在', data: {} };
    }

    let coverImage = product.cover_image || '';
    if (coverImage) {
      try {
        const tempRes = await cloud.getTempFileURL({ fileList: [coverImage] });
        const tempUrl = tempRes.fileList?.[0]?.status === 0 ? tempRes.fileList[0].tempFileURL : '';
        coverImage = tempUrl || coverImage;
      } catch (error) {
        console.error('封面图转换失败', error);
      }
    }

    const tuwenDetail = await replaceCloudFileUrls(product.tuwen_detail || '');

    const resultProduct = {
      _id: product._id,
      productId: product._id,
      name: product.name || '',
      price: product.price || 0,
      'original-price': product.original_price || 0,
      spec: product.spec || '',
      stock: Number(product.stock) || 0,
      lockedStock: Number(product.lockedStock) || 0,
      detail: product.detail || '',
      tuwen_detail: tuwenDetail,
      'cover-image': coverImage || '/assets/images/default.png',
      status: product.status || ''
    };

    return {
      code: 200,
      message: '获取商品详情成功',
      data: resultProduct
    };
  } catch (error) {
    console.error('获取商品详情失败:', error);
    return { code: 500, message: '获取商品详情失败', data: {} };
  }
};

exports.main = withResponse(handler);