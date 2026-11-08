import { config } from "./config.js";
import { factoryMap } from "./map-config.js";
import { energyResult, taskFromVision } from "./core.js";
const copy = (x) => JSON.parse(JSON.stringify(x));
async function asset(name) {
  const r = await fetch("assets/" + name);
  if (!r.ok) throw new Error("示例资料加载失败，请检查本地文件");
  return r.json();
}
const http = () =>
  window.axios.create({ baseURL: config.apiBase, timeout: config.timeout });
async function api(method, url, data) {
  try {
    return (
      await http().request({
        method,
        url,
        ...(method === "get" ? { params: data } : { data }),
      })
    ).data;
  } catch (e) {
    throw new Error(
      e.response?.data?.message ||
        "后端连接失败，请确认 Django 服务和接口配置。",
    );
  }
}
const mock = {
  async scenario() {
    return {
      map: copy(factoryMap),
      agvs: [
        { id: "AGV-01", battery: 92, wear: 12 },
        { id: "AGV-02", battery: 76, wear: 23 },
      ],
      tasks: [
        { id: "T-001", from: "source", to: "processing", status: "待分配" },
        { id: "T-002", from: "processing", to: "inspection", status: "待分配" },
      ],
    };
  },
  async visionSamples() {
    return asset("vision-samples.json");
  },
  async detectImage() {
    throw new Error("检测算法尚未接入，当前仅支持图片预览。");
  },
  async objects() {
    return {
      url: "assets/objects.svg",
      width: 640,
      height: 420,
      source: "人工构造的定位示例，非识别结果",
      objects: [
        { id: "OBJ-01", color: "红色", x: 108, y: 90, width: 112, height: 112 },
        { id: "OBJ-02", color: "蓝色", x: 353, y: 75, width: 107, height: 107 },
        {
          id: "OBJ-03",
          color: "黄色",
          x: 258,
          y: 240,
          width: 112,
          height: 112,
        },
      ],
    };
  },
  async sales() {
    return asset("sales-sample.json");
  },
  async forecast({ history, method, horizon }) {
    if (history.length < 28)
      throw new Error("至少选择 28 天历史数据才能展示预测示例。");
    const tail = history.slice(-28),
      mean = tail.reduce((s, r) => s + r.sales, 0) / tail.length;
    const start = new Date(history.at(-1).date + "T00:00:00Z");
    const points = Array.from({ length: horizon }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i + 1);
      return {
        date: d.toISOString().slice(0, 10),
        sales: Math.round(
          method === "weekly" ? history.at(-7 + (i % 7)).sales : mean,
        ),
      };
    });
    return {
      points,
      source: "demo",
      method,
      metrics: null,
      note: "仅使用最近 7 天重复或 28 天均值生成曲线示例，尚未训练与回测。",
    };
  },
  async energyDefaults() {
    return [
      {
        id: "machine1",
        name: "加工设备 A",
        group: "设备",
        power: 7.5,
        hours: 6,
      },
      {
        id: "machine2",
        name: "加工设备 B",
        group: "设备",
        power: 5.5,
        hours: 5,
      },
      {
        id: "inspection1",
        name: "视觉检测工位",
        group: "设备",
        power: 0.8,
        hours: 8,
      },
      { id: "agv1", name: "AGV-01", group: "AGV", power: 0.4, hours: 4 },
      { id: "agv2", name: "AGV-02", group: "AGV", power: 0.4, hours: 3 },
    ];
  },
  async energy(rows) {
    return energyResult(rows);
  },
};
const live = {
  scenario: () => api("get", "agv/scenario/"),
  visionSamples: () => api("get", "vision/samples/"),
  objects: () => api("get", "vision/objects/sample/"),
  sales: () => api("get", "orders/history/"),
  detectImage: (file, params) => {
    const data = new FormData();
    data.append("file", file);
    data.append("parameters", JSON.stringify(params));
    return api("post", "vision/detect/", data);
  },
  forecast: (data) => api("post", "orders/forecast/", data),
  energyDefaults: () => api("get", "energy/devices/"),
  energy: (rows) => api("post", "energy/calculate/", { devices: rows }),
};
export const service = config.mode === "mock" ? mock : live;
export const integration = { taskFromVision };

// 任务 5 独立接入本地 OpenCV 服务，其余模块继续使用原有演示数据。
export const objectVision = {
  async samples() {
    const response = await fetch('http://127.0.0.1:8000/api/vision/object/samples/');
    if (!response.ok) throw new Error('任务 5 样例加载失败。');
    return response.json();
  },
  async detect(file, calibrated) {
    const form = new FormData();
    form.append('file', file);
    if (calibrated) form.append('calibration', 'grid36');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/vision/object/detect/', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || '识别失败。');
      return result;
    } catch (error) {
      if (error instanceof TypeError) throw new Error('无法连接任务 5 后端，请先运行 python3 code/backend/server.py。');
      throw error;
    }
  },
};
