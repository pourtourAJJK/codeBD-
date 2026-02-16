// 官方默认头像链接
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Page({
  data: {
    avatarUrl: defaultAvatarUrl, // 头像链接（默认/选择后）
    nickName: '' // 用户昵称
  },

  // 1. 官方头像选择回调（自动过安全检测，仅返回合法头像）
  onChooseAvatar(e) {
    console.log("[官方头像选择] 头像临时路径：", e.detail.avatarUrl);
    this.setData({
      avatarUrl: e.detail.avatarUrl // 直接获取官方返回的临时路径
    });
  },

  // 2. 昵称输入回调
  onNicknameInput(e) {
    this.setData({
      nickName: e.detail.value
    });
  },

  // 3. 保存信息到数据库（核心：先上传头像到云存储，再写数据库）
  async saveUserInfo() {
    const { avatarUrl, nickName } = this.data;
    // 校验必填项
    if (avatarUrl === defaultAvatarUrl || !nickName) {
      wx.showToast({ title: '请完善头像和昵称', icon: 'none' });
      return;
    }

    try {
      let finalAvatarUrl = avatarUrl;
      // 若选择的是本地头像（非默认），上传到云存储（官方返回的是临时路径，需永久保存）
      if (avatarUrl !== defaultAvatarUrl) {
        console.log("[保存信息] 开始上传头像到云存储");
        // 生成唯一云存储路径
        const cloudPath = `user-avatars/${wx.getStorageSync('openid') || new Date().getTime()}-${Math.random().toString(36).substr(2, 10)}.png`;
        // 官方规范的上传方式（filePath传临时路径）
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: avatarUrl
        });
        finalAvatarUrl = uploadRes.fileID; // 云存储永久链接
        console.log("[保存信息] 头像上传成功，fileID：", finalAvatarUrl);
      }

      // 获取全局openid（确保已登录）
      const openid = getApp().globalData.openid;
      if (!openid) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }

      // 调用云函数写入数据库
      const dbRes = await wx.cloud.callFunction({
        name: "user-update",
        data: {
          openid,
          nickName,
          avatarUrl: finalAvatarUrl
        }
      });

      if (dbRes.result.code === 200) {
        wx.showToast({ title: '信息保存成功' });
        console.log("[保存信息] 数据库写入成功：", dbRes);
        // 跳转至我的页面
        wx.switchTab({ url: '/pages/mine/mine' });
      } else {
        wx.showToast({ title: '保存失败：' + dbRes.result.msg, icon: 'error' });
      }
    } catch (err) {
      console.error("[保存信息] 异常：", err);
      wx.showToast({ title: '保存失败', icon: 'error' });
    }
  }
});