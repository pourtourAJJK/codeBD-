const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 你的配置不变
const APPID = process.env.FX_APPID;
const APPSECRET = process.env.FX_APPSECRET;

exports.main = async (event) => {
  try {
    const adminId = event.admin_id;
    if (!adminId) return { code: -1, msg: "管理员ID不能为空" };

    // ======================
    // 开发测试：直接返回模拟二维码（跳过微信接口）
    // ======================
    console.log("=== 开发模式：使用模拟二维码测试功能 ===");
    return {
      code: 0,
      msg: "生成成功（测试版）",
      // 固定测试用二维码base64，前端正常渲染
      qrcode: "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAABjklEQVR42u3WoRKAMAwFwVwU"
    };

  } catch (err) {
    return { code: -1, msg: err.message || "未知错误" };
  }
};