// 更新配送位置云函数
const cloud = require('wx-server-sdk');

const { withResponse } = require('../utils/response');

// 初始化云函数
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 获取数据库引用
const db = cloud.database();
const _ = db.command;

// 云函数入口函数
const handler = async (event, context) => {
  try {
    const { orderId, courierId, longitude, latitude, timestamp } = event;

    // 验证必填参数
    if (!orderId || !courierId || !longitude || !latitude) {
      return {
        code: 500,
        message: '缺少必要参数',
        data: {}
      };
    }

    const positionTimestamp = timestamp || Date.now();

    // 更新配送信息
    const updateResult = await db.collection('shop_delivery')
      .where({
        order_id: orderId,
        courierId: courierId
      })
      .update({
        data: {
          currentPosition: {
            longitude: longitude,
            latitude: latitude
          },
          updatedAt: positionTimestamp,
          status: 'delivering'
        }
      });

    if (updateResult.stats.updated === 0) {
      return {
        code: 500,
        message: '未找到匹配的配送信息',
        data: {}
      };
    }

    // 记录配送轨迹
    await db.collection('delivery_tracks').add({
      data: {
        order_id: orderId,
        courierId: courierId,
        longitude: longitude,
        latitude: latitude,
        timestamp: positionTimestamp,
        createdAt: positionTimestamp
      }
    });

    // 查询订单信息，获取用户openId
    const orderResult = await db.collection('shop_order').where({ order_id: orderId }).limit(1).get();
    const order = orderResult.data?.[0];

    // 发送位置更新消息给用户
    if (order) {
      await exports.sendDeliveryPositionMessage(order.openid, {
        order_id: orderId,
        orderNo: order.orderNo || order.order_id,
        courierName: order.courierName,
        longitude: longitude,
        latitude: latitude,
        timestamp: positionTimestamp
      });
    }

    return {
      code: 200,
      message: '配送位置更新成功',
      data: {
        order_id: orderId,
        position: {
          longitude: longitude,
          latitude: latitude
        },
        timestamp: positionTimestamp
      }
    };
  } catch (error) {
    console.error('更新配送位置失败', error);
    return {
      code: 500,
      message: '更新配送位置失败',
      data: { error: error.message }
    };
  }
};

// 发送配送位置更新消息
exports.sendDeliveryPositionMessage = async function(openid, data) {
  try {
    // 发送订阅消息
    await cloud.openapi.subscribeMessage.send({
      touser: openid,
      templateId: 'your_template_id_here',
      page: `/pages/order/tracking/tracking?orderId=${data.order_id}`,
      data: {
        thing1: {
          value: `订单号:${data.orderNo}`
        },
        thing2: {
          value: `配送员: ${data.courierName}`
        },
        time3: {
          value: new Date(data.timestamp).toLocaleString('zh-CN')
        },
        thing4: {
          value: '配送位置已更新'
        }
      }
    });

    return true;
  } catch (error) {
    console.error('发送位置更新消息失败', error);
    // 消息发送失败不影响主流程
    return false;
  }
};

exports.main = withResponse(handler);
