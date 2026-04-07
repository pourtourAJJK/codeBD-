Page({
  onLoad(options) {
    // 扫码自动获取管理员ID
    const admin_id = options.scene
    console.log('管理员ID:', admin_id)
    
    // 微信官方唯一方式：获取管理员微信openid
    wx.login({
      success: (loginRes) => {
        console.log('登录成功:', loginRes)
        const code = loginRes.code
        
        // 调用云函数获取openid
        wx.cloud.callFunction({
          name: 'get-openid-new',
          data: { code },
          success: (res) => {
            console.log('获取openid结果:', res)
            const openid = res.result.data.openid
            console.log('用户openid:', openid)
            
            // 调用云函数完成绑定
            wx.cloud.callFunction({
              name: 'admin-wechat-bind',
              data: { admin_id, openid }
            }).then(res => {
              console.log('绑定结果:', res)
              if(res.result.success){
                wx.showToast({ title: '绑定成功' })
                // 1.5秒后自动返回
                setTimeout(()=>wx.navigateBack(),1500)
              } else {
                wx.showToast({ title: '绑定失败: ' + res.result.message, icon: 'none' })
              }
            }).catch(err => {
              console.error('绑定失败:', err)
              wx.showToast({ title: '绑定失败: ' + err.message, icon: 'none' })
            })
          },
          fail: (err) => {
            console.error('获取openid失败:', err)
            wx.showToast({ title: '获取用户信息失败', icon: 'none' })
          }
        })
      },
      fail: (err) => {
        console.error('登录失败:', err)
        wx.showToast({ title: '登录失败', icon: 'none' })
      }
    })
  }
})