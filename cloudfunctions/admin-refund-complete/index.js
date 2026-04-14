// 云函数名称：admin-refund-complete 
 // 功能：管理员标记退款已到账，写入到账时间、更新状态、追加操作记录 
 const cloud = require('wx-server-sdk'); 
 cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }); 
 const db = cloud.database(); 
 const _ = db.command; // 用于追加操作记录 
 
 exports.main = async (event, context) => { 
   const headers = { 
     "Access-Control-Allow-Origin": "*", 
     "Access-Control-Allow-Methods": "GET,POST,OPTIONS", 
     "Access-Control-Allow-Headers": "Content-Type" 
   }; 
   if(event.httpMethod === "OPTIONS") return { statusCode:204, headers }; 
 
   console.log("[退款到账] 接收参数：", event); 
   
   try { 
     // 1. 接收参数（管理员token + 退款单ID） 
     const { adminToken, refund_id, admin_name } = event; 
 
     // 2. 权限校验 
     if (!adminToken) { 
       return { 
         statusCode: 401, 
         headers, 
         body: JSON.stringify({ code: 401, message: "未登录" }) 
       }; 
     } 
 
     // 3. 必传参数校验 
     if (!refund_id) { 
       return { 
         statusCode: 400, 
         headers, 
         body: JSON.stringify({ code: 400, message: "退款单ID不能为空" }) 
       }; 
     } 
 
     const timestamp = Date.now(); // 统一数字时间戳 
 
     // 4. 更新退款单：标记已到账 + 写入到账时间 + 记录操作人 
     await db.collection('shop_refund') 
       .doc(refund_id) 
       .update({ 
         data: { 
           // 状态更新为【已退款】 
           refund_status: 4, 
           audit_status: "已完成", 
           refund_result_status: "已退款", 
           
           // 👇 核心：退款到账时间（数字类型，无报错） 
           refund_success_time: timestamp, 
           
           // 操作人/审核人 
           audit_by: admin_name || "管理员", 
           // 更新时间 
           update_time: timestamp, 
 
           // 👇 追加操作记录（不覆盖原有记录！） 
           operation_records: _.push({ 
             time: timestamp, 
             operator: admin_name || "管理员", 
             content: "退款已到账", 
             status: "已退款" 
           }) 
         } 
       }); 
 
     console.log("[退款到账] 处理成功，退款单ID：", refund_id); 
     
     return { 
       statusCode: 200, 
       headers, 
       body: JSON.stringify({ 
         code: 200, 
         message: "退款到账标记成功" 
       }) 
     }; 
 
   } catch (err) { 
     console.error("[退款到账] 失败：", err); 
     return { 
       statusCode: 500, 
       headers, 
       body: JSON.stringify({ code: 500, message: "操作失败：" + err.message }) 
     }; 
   } 
 };