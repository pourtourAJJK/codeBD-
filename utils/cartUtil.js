// 购物车工具函数

/**
 * 保存购物车数据到本地缓存
 * @param {Array} cartItems - 购物车商品列表
 */
function saveCartData(cartItems) {
  try {
    wx.setStorageSync('cartItems', cartItems);
  } catch (error) {
    console.error('保存购物车数据失败:', error);
  }
}

/**
 * 从本地缓存获取购物车数据
 * @returns {Array} 购物车商品列表
 */
function getCartData() {
  try {
    const cartItems = wx.getStorageSync('cartItems');
    return cartItems || [];
  } catch (error) {
    console.error('获取购物车数据失败:', error);
    return [];
  }
}

/**
 * 清除本地缓存的购物车数据
 */
function clearCartData() {
  try {
    wx.removeStorageSync('cartItems');
  } catch (error) {
    console.error('清除购物车数据失败:', error);
  }
}

/**
 * 计算购物车总价
 * @param {Array} cartItems - 购物车商品列表
 * @returns {number} 购物车总价
 */
function calculateTotalPrice(cartItems) {
  if (!Array.isArray(cartItems)) return 0;
  
  let totalPrice = 0;
  cartItems.forEach(item => {
    if (item.checked && item.stock > 0 && item.currentPrice && item.quantity) {
      totalPrice += Number(item.currentPrice) * Number(item.quantity);
    }
  });
  
  return Number(totalPrice.toFixed(2));
}

/**
 * 计算购物车选中商品数量
 * @param {Array} cartItems - 购物车商品列表
 * @returns {number} 选中商品数量
 */
function calculateSelectedCount(cartItems) {
  if (!Array.isArray(cartItems)) return 0;
  
  return cartItems.filter(item => item.checked && item.stock > 0).length;
}

/**
 * 计算购物车总商品数量
 * @param {Array} cartItems - 购物车商品列表
 * @returns {number} 总商品数量
 */
function calculateTotalCount(cartItems) {
  if (!Array.isArray(cartItems)) return 0;
  
  let totalCount = 0;
  cartItems.forEach(item => {
    if (item.quantity) {
      totalCount += Number(item.quantity);
    }
  });
  
  return totalCount;
}

/**
 * 格式化购物车商品数据
 * @param {Array} cartItems - 原始购物车数据
 * @returns {Array} 格式化后的购物车数据
 */
function formatCartItems(cartItems) {
  if (!Array.isArray(cartItems)) return [];
  
  return cartItems.map(item => ({
    ...item,
    // 确保价格为数字类型
    currentPrice: Number(item.currentPrice) || 0,
    originalPrice: Number(item.originalPrice) || 0,
    // 确保数量为数字类型
    quantity: Number(item.quantity) || 1,
    // 确保库存为数字类型
    stock: Number(item.stock) || 0,
    // 确保选中状态为布尔值
    checked: !!item.checked,
    // 计算小计
    subtotal: Number(item.currentPrice) * Number(item.quantity) || 0
  }));
}

/**
 * 检查购物车是否全选
 * @param {Array} cartItems - 购物车商品列表
 * @returns {boolean} 是否全选
 */
function checkIsAllSelected(cartItems) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return false;
  
  const availableItems = cartItems.filter(item => item.stock > 0);
  if (availableItems.length === 0) return false;
  
  return availableItems.every(item => item.checked);
}

/**
 * 检查是否有选中的商品
 * @param {Array} cartItems - 购物车商品列表
 * @returns {boolean} 是否有选中商品
 */
function hasSelectedItems(cartItems) {
  if (!Array.isArray(cartItems)) return false;
  
  return cartItems.some(item => item.checked && item.stock > 0);
}

/**
 * 更新单个购物车商品的本地缓存
 * @param {string} itemId - 商品项ID
 * @param {Object} updates - 更新的数据
 */
function updateLocalCartItem(itemId, updates) {
  try {
    const cartItems = getCartData();
    const index = cartItems.findIndex(item => item._id === itemId);
    
    if (index !== -1) {
      cartItems[index] = { ...cartItems[index], ...updates };
      saveCartData(cartItems);
    }
  } catch (error) {
    console.error('更新本地购物车数据失败:', error);
  }
}

/**
 * 从本地缓存删除购物车商品
 * @param {string} itemId - 商品项ID
 */
function removeLocalCartItem(itemId) {
  try {
    let cartItems = getCartData();
    cartItems = cartItems.filter(item => item._id !== itemId);
    saveCartData(cartItems);
  } catch (error) {
    console.error('删除本地购物车商品失败:', error);
  }
}

/**
 * 批量从本地缓存删除购物车商品
 * @param {Array} itemIds - 商品项ID列表
 */
function removeLocalCartItems(itemIds) {
  try {
    let cartItems = getCartData();
    cartItems = cartItems.filter(item => !itemIds.includes(item._id));
    saveCartData(cartItems);
  } catch (error) {
    console.error('批量删除本地购物车商品失败:', error);
  }
}

/**
 * 更新购物车角标数量
 * @param {number} count - 数量
 */
function updateCartBadge(count) {
  try {
    if (count > 0) {
      wx.setTabBarBadge({
        index: 2, // 购物车tab索引（假设在第3位）
        text: String(count)
      });
    } else {
      wx.removeTabBarBadge({
        index: 2
      });
    }
  } catch (error) {
    console.error('更新购物车角标失败:', error);
  }
}

/**
 * 从购物车数据中获取选中的商品
 * @param {Array} cartItems - 购物车商品列表
 * @returns {Array} 选中的商品列表
 */
function getSelectedItems(cartItems) {
  if (!Array.isArray(cartItems)) return [];
  
  return cartItems.filter(item => item.checked && item.stock > 0);
}

/**
 * 检查购物车商品是否有库存不足的情况
 * @param {Array} cartItems - 购物车商品列表
 * @returns {Array} 库存不足的商品列表
 */
function checkStockAvailability(cartItems) {
  if (!Array.isArray(cartItems)) return [];
  
  return cartItems.filter(item => item.quantity > item.stock);
}

module.exports = {
  saveCartData,
  getCartData,
  clearCartData,
  calculateTotalPrice,
  calculateSelectedCount,
  calculateTotalCount,
  formatCartItems,
  checkIsAllSelected,
  hasSelectedItems,
  updateLocalCartItem,
  removeLocalCartItem,
  removeLocalCartItems,
  updateCartBadge,
  getSelectedItems,
  checkStockAvailability
};