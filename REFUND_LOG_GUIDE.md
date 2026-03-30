# 退款流程全链路日志排查指南

## 日志格式说明

所有日志统一格式：`[时间] [模块-步骤] [订单ID/退款单号] 关键信息`

---

## 退款全链路流程

```
前端退款确认页 → wxpayFunctions(wxpay_refund) → wxpay_refund子云函数 → 微信支付API → refund-notify回调 → shop_refund表更新 → order-update-status更新订单状态
```

---

## 排查步骤

### 第一步：查看前端日志

**文件路径**: `pages/order/refund-confirm/refund-confirm.js`

**关键日志标识**:
- `[前端-退款确认-提交开始]` - 退款开始
- `[前端-退款确认-参数校验]` - 参数校验
- `[前端-退款确认-云函数调用]` - 调用wxpayFunctions
- `[前端-退款确认-退款表写入]` - 写入shop_refund表
- `[前端-退款确认-订单状态更新]` - 更新订单状态

**常见问题排查**:
1. 如果在`[前端-退款确认-参数校验]`处停止，检查是否选择了收货状态和退款原因
2. 如果在`[前端-退款确认-云函数调用]`后报错，检查云函数是否部署成功

---

### 第二步：查看wxpayFunctions日志

**文件路径**: `cloudfunctions/wxpayFunctions/index.js`

**关键日志标识**:
- `[wxpayFunctions-wxpay_refund-开始]` - 接收退款请求
- `[wxpayFunctions-wxpay_refund-参数]` - 参数详情
- `[wxpayFunctions-wxpay_refund-返回]` - wxpay_refund子云函数返回

**常见问题排查**:
1. 如果看到`[wxpayFunctions-wxpay_refund-异常]`，检查错误信息
2. 重点检查参数是否完整：orderId、transaction_id、out_refund_no、refundFee、totalFee

---

### 第三步：查看wxpay_refund子云函数日志

**文件路径**: `cloudfunctions/wxpayFunctions/wxpay_refund/index.js`

**关键日志标识**:
- `[wxpay_refund-开始]` - 接收请求
- `[wxpay_refund-微信退款API-开始]` - 调用微信支付退款API
- `[wxpay_refund-微信退款API-请求]` - 请求详情（URL、请求头、请求体）
- `[wxpay_refund-微信退款API-响应]` - 微信支付API响应
- `[wxpay_refund-成功]` - 退款申请成功

**常见问题排查**:
1. **-501001 FUNCTION_NOT_FOUND错误**:
   - 检查云函数是否已部署
   - 确认云函数名称是否正确（`wxpay_refund`）
2. **参数缺失错误**:
   - 检查`transaction_id`是否存在
   - 检查`refundFee`和`totalFee`是否大于0
3. **签名错误**:
   - 检查微信支付配置（appid、mchid、privateKey、serialNo、apiV3Key）
   - 检查证书是否正确配置
4. **微信支付API返回错误**:
   - 查看`[wxpay_refund-微信退款API-响应]`中的完整错误信息
   - 检查微信支付商户平台是否有足够余额
   - 检查订单是否支持退款（支付时间是否超过退款期限）

---

### 第四步：查看refund-notify回调日志

**文件路径**: `cloudfunctions/refund-notify/index.js`

**关键日志标识**:
- `[refund-notify-开始]` - 接收微信退款回调
- `[refund-notify-验签]` - 验签过程
- `[refund-notify-回调数据]` - 回调数据解析
- `[refund-notify-更新退款表]` - 更新shop_refund表
- `[refund-notify-更新订单状态]` - 更新shop_order表

**常见问题排查**:
1. **验签失败**:
   - 检查微信支付平台证书是否正确
   - 确认回调地址是否正确配置
2. **退款表更新失败**:
   - 检查`out_refund_no`是否匹配
   - 确认shop_refund表是否存在
3. **订单状态未更新**:
   - 检查退款状态是否为`SUCCESS`
   - 确认`out_trade_no`是否匹配shop_order表中的订单号

---

### 第五步：查看order-update-status日志

**文件路径**: `cloudfunctions/order-update-status/index.js`

**关键日志标识**:
- `[order-update-status-开始]` - 接收状态更新请求
- `[order-update-status-用户验证]` - 用户权限验证
- `[order-update-status-查询订单]` - 查询当前订单状态
- `[order-update-status-安全校验]` - 双字段安全校验
- `[order-update-status-更新数据库]` - 更新shop_order表

**常见问题排查**:
1. **用户验证失败**:
   - 检查用户是否已登录
   - 确认用户openid是否正确
2. **订单不存在或无权限**:
   - 检查订单ID是否正确
   - 确认订单是否属于当前用户
3. **双字段安全校验失败**:
   - 检查当前订单的`pay_status`和`statusmax`
   - 确认目标状态是否符合业务规则

---

## 快速排查清单

### 排查 `-501001 FUNCTION_NOT_FOUND` 错误

1. [ ] 确认`wxpay_refund`云函数已部署
2. [ ] 确认云函数名称拼写正确（区分大小写）
3. [ ] 检查云函数是否在正确的环境中
4. [ ] 查看微信开发者工具的云函数列表
5. [ ] 重新部署`wxpayFunctions`和`wxpay_refund`云函数

### 排查退款失败

1. [ ] 检查前端日志，确认参数是否完整
2. [ ] 检查wxpayFunctions日志，确认请求是否到达
3. [ ] 检查wxpay_refund日志，确认微信支付API调用
4. [ ] 检查微信支付商户平台，确认退款记录
5. [ ] 检查refund-notify日志，确认回调是否收到
6. [ ] 检查shop_refund表，确认退款记录
7. [ ] 检查shop_order表，确认订单状态

### 排查状态未更新

1. [ ] 检查order-update-status日志
2. [ ] 确认用户权限验证通过
3. [ ] 确认订单存在且有权限
4. [ ] 确认双字段安全校验通过
5. [ ] 确认数据库更新成功
6. [ ] 检查前端本地缓存`refundStatusMap`

---

## 敏感数据说明

以下数据在日志中已脱敏：
- `transaction_id` - 只显示前10位 + `...`
- 用户隐私数据 - 不记录在日志中

完整的敏感数据可以在以下位置查看：
- 微信支付商户平台
- 数据库（shop_order表、shop_refund表）

---

## 需要重新上传的云函数

完成日志添加后，请重新上传以下云函数：

1. **wxpayFunctions** - 主支付云函数
2. **wxpay_refund** - 退款子云函数（位于wxpayFunctions目录下）
3. **refund-notify** - 退款回调云函数
4. **order-update-status** - 订单状态更新云函数

---

## 联系支持

如果按照以上步骤仍无法解决问题，请提供以下信息：
1. 完整的日志截图（从前端到后端的全链路）
2. 订单ID或退款单号
3. 错误发生的时间点
4. 微信支付商户平台的退款记录截图
