const cloud = require('wx-server-sdk');
const { withResponse } = require('./response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const ORDER_COLLECTION = 'shop_order';
const ORDER_ITEMS_COLLECTION = 'orderItems';
const PRODUCT_COLLECTION = 'shop_spu';
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

    // ========== 新增：接收预约配送时间字段 ==========
    const { 
      goods, items, address, userInfo, totalPrice, couponId, remark, 
      selectedAppointment // 新增：预约配送时间（从前端confirm.js传过来）
    } = event;
    const rawItems = Array.isArray(goods) ? goods.flat() : (Array.isArray(items) ? items.flat() : []);

    if (!rawItems || rawItems.length === 0) {
      return { code: 500, message: '请至少选择一个商品', data: {} };
    }

    if (!address || !address.name || !address.phone || !address.detail) {
      return { code: 500, message: '请选择有效的收货地址', data: {} };
    }

    const normalizedItems = rawItems.map(item => ({
      ...item,
      product_id: item.product_id || item.productId || item.id
    }));

    const productIds = normalizedItems.map(item => item.product_id).filter(Boolean);
    if (productIds.length === 0) {
      return { code: 500, message: '商品参数不完整', data: {} };
    }

    const productRes = await db.collection(PRODUCT_COLLECTION)
      .where({ _id: _.in(productIds) })
      .get();
    const productMap = (productRes.data || []).reduce((map, product) => {
      map[product._id] = product;
      return map;
    }, {});

    for (const item of normalizedItems) {
      const product = productMap[item.product_id];
      if (!product) {
        return { code: 500, message: `商品${item.product_id}不存在`, data: {} };
      }
      const quantity = Number(item.quantity) || 0;
      if (quantity <= 0) {
        return { code: 500, message: '商品数量不合法', data: {} };
      }
      const available = Number(product.stock || 0) - Number(product.lockedStock || 0);
      if (available < quantity) {
        return { code: 500, message: `商品${product.name || product._id}库存不足`, data: {} };
      }
    }

    // 新编号：FX + yyyyMMddHHmmss + 7位随机数（仅影响新订单）
    const now = new Date();
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const randPart = Math.floor(Math.random() * 1e7).toString().padStart(7, '0');
    const orderNo = `FX${datePart}${randPart}`;
    const orderItems = normalizedItems.map(item => {
      const product = productMap[item.product_id] || {};
      return {
        order_id: orderNo,
        product_id: item.product_id,
        quantity: Number(item.quantity) || 1,
        openid,
        product_name: product.name || item.product_name || item.name || '商品名称',
        price: Number(product.price || item.price || 0),
        spec: product.spec || item.spec || '',
        cover_image: product.cover_image || item.cover_image || '',
        createdAt: db.serverDate()
      };
    });

    const transactionId = orderNo || `TX${Date.now()}${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

    // 获取用户信息
    const user = userRes.data[0];
    
    // 构建用户信息对象（兼容 nickname/nickName）
    const userInfoObj = {
      nickName: user.nickName || user.nickname || '', // 兼容两种字段名
      avatarUrl: user.avatarUrl || user.avatar || ''
    };
    
    // ========== 最终版：预约配送时间处理（模型不变+前端兼容） ==========
    const appointmentDay = selectedAppointment?.day || ''; // 原始日期字符串 "2026-3-27"
    const appointmentTime = selectedAppointment?.time || ''; // 原始时间段字符串 "09:00-11:00"
    const appointmentDayLabel = selectedAppointment?.dayLabel || ''; // "3月27日 (周五)"
    const appointmentTimeLabel = selectedAppointment?.timeLabel || ''; // "09:00-11:00"

    // 1. 满足模型数字类型：转时间戳（deliveryDate/deliveryTime 必须是数字）
    const deliveryDate = appointmentDay ? new Date(appointmentDay).getTime() : 0; // 日期时间戳
    let deliveryTime = 0;
    if (appointmentDay && appointmentTime) {
      const timeStart = appointmentTime.split('-')[0]; // 取时间段开始值 "09:00"
      const fullDateTime = `${appointmentDay} ${timeStart}`; // "2026-3-27 09:00"
      deliveryTime = new Date(fullDateTime).getTime(); // 转成时间戳数字
    }

    // 2. 新增：存储原始字符串（供前端直接展示，不用再转）
    const deliveryTimeStr = appointmentTime; // 原始 "09:00-11:00"
    const deliveryDateStr = appointmentDay; // 原始 "2026-3-27"

    // 3. 展示标签（不变）
    const deliveryLabel = `${appointmentDayLabel} ${appointmentTimeLabel}`.trim();
    // ========== 结束：预约配送时间处理 ==========

    const orderData = {
      order_id: orderNo,
      orderNo,
      openid,
      // ========== 优化：用户信息字段（兼容前端 nickname/nickName） ==========
      userInfo: Array.isArray(userInfo) ? userInfo : (userInfo ? [userInfo] : [userInfoObj]),
      nickName: user.nickName || user.nickname || '', // 统一兼容
      avatarUrl: user.avatarUrl || user.avatar || '',
      // ========== 优化：地址字段（name对应用户姓名） ==========
      address: Array.isArray(address) ? address : (address ? [address] : []),
      addressId: address._id || '',
      consignee: address.name || '', // 地址中的name对应收货人姓名（如"饺子"）
      deliveryDate: deliveryDate,        // 数字：满足模型要求
      deliveryTime: deliveryTime,        // 数字：满足模型要求
      deliveryTimeStr: deliveryTimeStr,  // 字符串：供前端直接展示 "09:00-11:00"
      deliveryDateStr: deliveryDateStr,  // 字符串：供前端直接展示 "2026-3-27"
      deliveryLabel: deliveryLabel,      // 字符串：完整展示标签 "3月27日 (周五) 09:00-11:00"
      // ========== 原有字段保留 ==========
      totalPrice: Number(totalPrice || 0),
      paymentAmount: Number(totalPrice || 0),
      paidAmount: 0,
      couponId: couponId || '',
      statusmax: "1",
      pay_status: "0",
      out_trade_no: transactionId,
      transaction_id: transactionId,
      success_time: '',
      remark: remark || '',
      goods: orderItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        product_name: item.product_name,
        price: item.price,
        spec: item.spec,
        cover_image: item.cover_image
      })),
      cancelPayTime: new Date(Date.now() + 15 * 60 * 1000), // 15分钟后自动取消时间
      autoCancelStatus: 'pending',
      stockLocked: true,
      lockedStock: orderItems.map(it => ({
        productId: it.product_id,
        quantity: it.quantity
      })),
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
      createTime: db.serverDate()
    };

    let transaction;
    try {
      transaction = await db.startTransaction();
      console.log('开始事务，订单号:', orderNo);
      
      // 顺序更新库存，避免事务长时间占用导致 TransactionNotExist
      console.log('更新商品库存，商品数量:', normalizedItems.length);
      for (const item of normalizedItems) {
        console.log('更新商品:', item.product_id, '数量:', item.quantity);
        await transaction.collection(PRODUCT_COLLECTION)
          .doc(item.product_id)
          .update({ data: { lockedStock: _.inc(Number(item.quantity) || 0), updatedAt: db.serverDate() } });
        console.log('商品库存更新成功:', item.product_id);
      }

      console.log('写入订单数据:', orderNo);
      const orderResult = await transaction.collection(ORDER_COLLECTION).add({ data: orderData });
      if (!orderResult._id) {
        const error = new Error('订单写入失败：未返回订单ID');
        console.error('订单写入失败:', error);
        throw error;
      }
      console.log('订单写入成功，订单ID:', orderResult._id);

      console.log('写入订单商品，商品数量:', orderItems.length);
      for (const item of orderItems) {
        console.log('写入商品:', item.product_id);
        await transaction.collection(ORDER_ITEMS_COLLECTION).add({ data: item });
        console.log('商品写入成功:', item.product_id);
      }

      console.log('提交事务');
      await transaction.commit();
      console.log('事务提交成功');

      // 事务提交成功后 立即添加
      const checkRes = await db.collection('shop_order').where({
        orderNo: orderNo
      }).get();
      console.log('✅ 事务提交后立即查询结果：', checkRes.data);

      return {
        code: 200,
        message: '订单创建成功',
        data: {
          order_id: orderNo,
          orderNo
        }
      };
    } catch (error) {
      console.error('订单创建过程中出错:', error);
      if (transaction) {
        try {
          console.log('回滚事务');
          await transaction.rollback();
          console.log('事务回滚成功');
        } catch (rollbackErr) {
          console.error('订单创建回滚失败', rollbackErr);
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('订单创建失败', error);
    return {
      code: 500,
      message: error?.message ? `订单创建失败: ${error.message}` : '订单创建失败',
      data: { error: error?.message || '' }
    };
  }
};

exports.main = withResponse(handler);