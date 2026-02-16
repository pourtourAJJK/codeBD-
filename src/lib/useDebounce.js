// src/lib/useDebounce.js
// 基础防抖函数实现，避免编译报错
export default function useDebounce(func, delay = 300) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}