import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { compile } from "@vue/compiler-dom";

test("Vue 模板能编译为有效 JavaScript，避免排版破坏插值表达式", async () => {
  for (const name of ["home", "agv", "vision", "orders", "energy", "info"]) {
    const module = await import("../src/pages/" + name + ".js");
    for (const component of Object.values(module)) {
      if (component.template) assert.doesNotThrow(() => new Function(compile(component.template).code), name);
    }
  }
});
import { factoryMap } from "../src/map-config.js";
import {
  demoRoute,
  walkable,
  validateMap,
  energyResult,
  taskFromVision,
  aggregateSales,
} from "../src/core.js";
test("所有工位组合的示例路线必须绕开固定障碍，起终点与配置一致", () => {
  validateMap(factoryMap);
  for (const a of factoryMap.stations)
    for (const b of factoryMap.stations) {
      const route = demoRoute(factoryMap, a.id, b.id);
      assert.deepEqual(route[0], a.dock);
      assert.deepEqual(route.at(-1), b.dock);
      assert.ok(route.every((p) => walkable(factoryMap, p)));
      for (let i = 1; i < route.length; i++)
        assert.equal(
          Math.abs(route[i].x - route[i - 1].x) +
            Math.abs(route[i].y - route[i - 1].y),
          1,
        );
    }
});
test("移动停靠点后工位编号仍解析到新位置；受阻路线明确失败", () => {
  const map = structuredClone(factoryMap);
  map.stations.find((s) => s.id === "inspection").dock = { x: 13, y: 4 };
  assert.deepEqual(demoRoute(map, "home", "inspection").at(-1), {
    x: 13,
    y: 4,
  });
  map.obstacles.push({ x: 13, y: 6, w: 1, h: 1 });
  assert.throws(() => demoRoute(map, "home", "inspection"), /阻挡/);
});
test("无效停靠点被地图校验拒绝", () => {
  const map = structuredClone(factoryMap);
  map.stations[0].dock = { x: 1, y: 1 };
  assert.throws(() => validateMap(map), /不可通行/);
});
test("非整数通道配置立即拒绝，不进入无限步进", () => {
  const map = structuredClone(factoryMap);
  map.corridorY = 7.5;
  assert.throws(() => validateMap(map), /整数网格/);
  assert.throws(() => demoRoute(map, "home", "inspection"), /无效/);
});
test("用电计算允许零，拒绝缺失、负值、非数字和超出单日时长", () => {
  assert.equal(
    energyResult([
      { power: 7.5, hours: 6 },
      { power: 0, hours: 24 },
    ]).total,
    45,
  );
  for (const row of [
    { power: "", hours: 3 },
    { power: -1, hours: 3 },
    { power: 1, hours: 25 },
    { power: "bad", hours: 3 },
    { power: 1, hours: null },
  ])
    assert.throws(() => energyResult([row]));
});
test("视觉联动仅转换为工位任务，未知状态不会自动派车", () => {
  assert.deepEqual(taskFromVision({ id: "v1", decision: "suspected" }), {
    from: "inspection",
    to: "review",
    source: "vision",
    inspectionId: "v1",
  });
  assert.equal(taskFromVision({ decision: "unknown" }), null);
  assert.equal(taskFromVision({ decision: "clear" }).to, "processing");
});
test("按周与月汇总正确处理跨年日期", () => {
  const rows = [
    { date: "2017-12-31", sales: 4 },
    { date: "2018-01-01", sales: 5 },
    { date: "2018-01-02", sales: 6 },
  ];
  assert.deepEqual(aggregateSales(rows, "week"), [
    { date: "2017-12-25", sales: 4 },
    { date: "2018-01-01", sales: 11 },
  ]);
  assert.deepEqual(aggregateSales(rows, "month"), [
    { date: "2017-12", sales: 4 },
    { date: "2018-01", sales: 11 },
  ]);
});
test("历史样例包含六条完整序列并与日期对齐", () => {
  const data = JSON.parse(
    fs.readFileSync(new URL("../assets/sales-sample.json", import.meta.url)),
  );
  assert.equal(data.dates.length, 1826);
  assert.equal(data.dates[0], "2013-01-01");
  assert.equal(data.dates.at(-1), "2017-12-31");
  assert.equal(Object.keys(data.series).length, 6);
  for (const values of Object.values(data.series)) {
    assert.equal(values.length, data.dates.length);
    assert.ok(values.every((x) => Number.isInteger(x) && x >= 0));
  }
});
