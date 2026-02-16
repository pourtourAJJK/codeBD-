// 获取配送信息云函数
const cloud = require('wx-server-sdk');

const { withResponse } = require('../utils/response');

// 初始化云函数
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库引用
const db = cloud.database();

// 检查并创建集合的辅助函数
async function ensureCollectionExists(collectionName) {
  try {
    await db.collection(collectionName).count();
    console.log(`集合 ${collectionName} 已存在`);
  } catch (error) {
    if (error.errCode === -502005 || error.message.includes('collection not exists')) {
      try {
        await db.createCollection(collectionName);
        console.log(`成功创建集合: ${collectionName}`);
      } catch (createError) {
        console.error(`创建集合 ${collectionName} 失败:`, createError);
        throw createError;
      }
    } else {
      throw error;
    }
  }
}

// 云函数入口函数
const handler = async (event, context) => {
  try {
    // 确保所有需要的集合存在
    await Promise.all([
      ensureCollectionExists('shop_order'),
      ensureCollectionExists('shop_delivery'),
      ensureCollectionExists('couriers'),
      ensureCollectionExists('delivery_tracks')
    ]);

    const { orderId } = event;

    // 验证订单ID
    if (!orderId) {
      return {
        code: 500,
        message: '订单ID不能为空',
        data: {}
      };
    }

    // 查询订单信息
    const orderResult = await db.collection('shop_order').where({ order_id: orderId }).limit(1).get();
    const order = orderResult.data?.[0] || null;

    if (!order) {
      return {
        code: 500,
        message: '订单不存在',
        data: {}
      };
    }

    // 查询配送信息
    const deliveryResult = await db.collection('shop_delivery')
      .where({
        order_id: orderId
      })
      .get();

    if (deliveryResult.data.length === 0) {
      return {
        code: 500,
        message: '未找到配送信息',
        data: {}
      };
    }

    const deliveryInfo = deliveryResult.data[0];

    // 查询配送员信息
    const courierResult = await db.collection('couriers')
      .doc(deliveryInfo.courierId)
      .get();

    const courier = courierResult.data;

    // 查询配送轨迹
    const trackResult = await db.collection('delivery_tracks')
      .where({
        order_id: orderId
      })
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    // 模拟配送步骤数据
    const steps = [
      {
        id: 1,
        status: '已接单',
        time: new Date(order.createdAt).toISOString(),
        description: '商家已接单，正在准备商品'
      },
      {
        id: 2,
        status: '待取货',
        time: new Date(order.createdAt + 5 * 60 * 1000).toISOString(),
        description: '商品已准备好，等待配送员取货'
      },
      {
        id: 3,
        status: '配送中',
        time: new Date(order.createdAt + 15 * 60 * 1000).toISOString(),
        description: '配送员已取货，正在配送途中'
      },
      {
        id: 4,
        status: '即将到达',
        time: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        description: '配送员即将到达，请准备收货'
      },
      {
        id: 5,
        status: '已送达',
        time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        description: '商品已送达，请确认收货'
      }
    ];

    // 确定当前步骤
    const currentStep = steps.find(step => step.status === deliveryInfo.status) || steps[0];

    // 构建返回数据
    const result = {
      code: 200,
      message: '获取配送信息成功',
      data: {
        deliveryInfo: {
          order_id: orderId,
          orderStatus: order.status,
          orderStatusText: exports.getOrderStatusText(order.status),
          orderStatusTime: new Date().toISOString(),
          storeLocation: {
            longitude: order.storeLocation.longitude,
            latitude: order.storeLocation.latitude
          },
          currentPosition: deliveryInfo.currentPosition,
          destination: order.destination,
          courier: {
            id: courier._id,
            name: courier.name,
            phone: courier.phone,
            avatar: courier.avatar
          },
          track: trackResult.data,
          steps: steps,
          currentStep: currentStep,
          eta: exports.calculateETA(deliveryInfo.currentPosition, order.destination)
        }
      }
    };

    return result;
  } catch (error) {
    console.error('获取配送信息失败', error);
    return {
      code: 500,
      message: '获取配送信息失败',
      data: { error: error.message }
    };
  }
};

// 获取订单状态文本
exports.getOrderStatusText = function(status) {
  const statusMap = {
    pending: '待处理',
    processing: '处理中',
    shipped: '已发货',
    delivering: '配送中',
    delivered: '已送达',
    completed: '已完成',
    cancelled: '已取消'
  };

  return statusMap[status] || '未知状态';
};

// 计算预计到达时间
exports.calculateETA = function(currentPosition, destination) {
  // 模拟计算，实际应根据地图API计算距离和时间
  return '30分钟';
};

exports.main = withResponse(handler);
