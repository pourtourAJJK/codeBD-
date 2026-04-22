// 上传用户操作日志（通用方法，对齐数据模型版）
const uploadUserLog = async (params) => {
  try {
    // 获取小程序设备信息（自动上传，维权用）
    const systemInfo = wx.getSystemInfoSync()
    console.log('【日志上传】开始上传，参数:', params)
    // 调用云函数上传日志
    const res = await wx.cloud.callFunction({
      name: 'add-user-operation-log',
      data: {
        // 设备信息封装为对象，后续云函数转JSON字符串
        client_info: {
          model: systemInfo.model, // 手机型号
          system: systemInfo.system, // 系统版本
          platform: systemInfo.platform // 平台(ios/android)
        },
        ...params
      }
    })
    console.log('【日志上传】云函数返回:', res)
  } catch (err) {
    // 日志上传失败不阻塞主业务，仅打印
    console.error('日志上传失败', err)
  }
}

module.exports = {
  uploadUserLog
}
