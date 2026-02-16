
const https = require('https');

// 微信小程序 AppID 和 AppSecret，从环境变量中获取
// 确保已在云函数环境变量中配置 WECHAT_APPID 和 WECHAT_APPSERCET
const APPID = process.env.WECHAT_APPID;
const SECRET = process.env.WECHAT_APPSERCET; // 注意：对应控制台配置的变量名

/**
 * 主函数，处理获取 openid 的请求
 * 同时将 session_key 保存到数据库，供后续手机号解密使用
 * @param {object} event - 包含 code 的事件对象
 * @param {object} context - 云函数上下文
 * @returns {Promise<object>} - 包含 openid 或错误信息的对象
 */
exports.main = async (event, context) => {
    const { code } = event;

    // 1. 验证输入参数
    if (!code) {
        return {
            errCode: -1,
            errMsg: 'Missing code',
            data: null
        };
    }

    // 2. 验证服务器配置
    console.log('[get-openid-new] 环境变量检查 - APPID:', APPID ? '已配置' : '未配置', 'SECRET:', SECRET ? '已配置' : '未配置');
    if (!APPID || !SECRET) {
        console.error('云函数环境变量配置问题详情:', {
            APPID: APPID || '空',
            SECRET: SECRET ? '已配置(隐藏显示)' : '未配置',
            allEnv: Object.keys(process.env).filter(k => k.includes('WECHAT'))
        });
        return {
            errCode: -2,
            errMsg: `服务器配置错误: ${!APPID ? 'WECHAT_APPID未配置' : 'WECHAT_APPSERCET未配置'}`,
            data: null
        };
    }

    // 3. 构造请求URL
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${SECRET}&js_code=${code}&grant_type=authorization_code`;

    // 4. 发起HTTPS请求
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', async () => {
                try {
                    const result = JSON.parse(data);
                    if (result.errcode) {
                        // 微信API返回错误
                        console.error('微信API返回错误:', result);
                        resolve({
                            errCode: result.errcode,
                            errMsg: result.errmsg,
                            data: null
                        });
                    } else {
                        // 成功获取 session_key 和 openid
                        console.log('[get-openid-new] 成功从微信API获取会话。OpenID:', result.openid);
                        console.log('[get-openid-new] session_key 已获取:', result.session_key ? '是' : '否');
                        
                        // 直接返回 openid 和 session_key 给前端
                        // 让前端传递给 user-login-v2 保存到 shop_user 集合
                        resolve({
                            errCode: 0,
                            errMsg: 'OK',
                            data: {
                                openid: result.openid,
                                session_key: result.session_key  // ✅ 返回 session_key
                            }
                        });
                    }
                } catch (e) {
                    console.error('解析微信API响应失败:', e);
                    resolve({
                        errCode: -3,
                        errMsg: '解析微信API响应失败',
                        data: null
                    });
                }
            });

        }).on('error', (err) => {
            console.error('请求微信API失败:', err);
            resolve({
                errCode: -4,
                errMsg: '请求微信API失败',
                data: null
            });
        });
    });
};
