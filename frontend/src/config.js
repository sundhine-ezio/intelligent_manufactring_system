// 改为 http 后，失败会直接显示，不会自动退回演示结果。
export const config = {
  mode: "mock",
  apiBase: "http://127.0.0.1:8000/api/",
  timeout: 15000,
};
