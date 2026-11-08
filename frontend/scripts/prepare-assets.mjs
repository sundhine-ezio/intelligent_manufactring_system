import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.resolve(root, "..", "..", "数据集");
const dest = path.join(root, "assets");
fs.mkdirSync(dest, { recursive: true });
const dates = [];
const series = {};
const stores = [1, 2],
  items = [1, 2, 3];
for (const line of fs
  .readFileSync(path.join(source, "商品销售数据.csv"), "utf8")
  .trim()
  .split(/\r?\n/)
  .slice(1)) {
  const [date, st, it, value] = line.split(",");
  if (!stores.includes(+st) || !items.includes(+it)) continue;
  const key = st + ":" + it;
  (series[key] ??= []).push(+value);
  if (key === "1:1") dates.push(date);
}
fs.writeFileSync(
  path.join(dest, "sales-sample.json"),
  JSON.stringify({
    source: "商品销售数据.csv；真实历史子集，未修改销量",
    stores,
    items,
    dates,
    series,
  }),
);
const samples = [];
for (const [name, label] of [
  ["crazing_1", "龟裂示例"],
  ["scratches_1", "划痕示例"],
]) {
  fs.copyFileSync(
    path.join(source, "图像数据/images", name + ".jpg"),
    path.join(dest, name + ".jpg"),
  );
  const boxes = fs
    .readFileSync(path.join(source, "图像数据/labels", name + ".txt"), "utf8")
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const [classId, cx, cy, w, h] = line.trim().split(/\s+/).map(Number);
      return {
        classId,
        x: (cx - w / 2) * 200,
        y: (cy - h / 2) * 200,
        width: w * 200,
        height: h * 200,
      };
    });
  samples.push({
    id: name,
    name: label,
    url: "assets/" + name + ".jpg",
    width: 200,
    height: 200,
    boxes,
    provenance: "人工标注；来源为同名标签文件，不是模型输出",
  });
}
fs.writeFileSync(
  path.join(dest, "vision-samples.json"),
  JSON.stringify(samples, null, 2),
);
console.log("已提取 6 条真实历史序列与 2 张视觉示例，原始资料未修改。");
