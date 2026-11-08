export function validateMap(map) {
  if (
    !Number.isInteger(map.cols) ||
    !Number.isInteger(map.rows) ||
    map.cols < 1 ||
    map.rows < 1 ||
    !Number.isInteger(map.corridorY) ||
    map.corridorY < 0 ||
    map.corridorY >= map.rows
  )
    throw new Error("地图尺寸和通道位置必须是有效整数网格");
  const ids = new Set();
  for (const s of map.stations) {
    if (ids.has(s.id)) throw new Error("工位编号重复：" + s.id);
    ids.add(s.id);
    if (!walkable(map, s.dock)) throw new Error(s.name + "的停靠点不可通行");
  }
}
export function walkable(map, p) {
  return (
    Number.isInteger(p.x) &&
    Number.isInteger(p.y) &&
    p.x >= 0 &&
    p.y >= 0 &&
    p.x < map.cols &&
    p.y < map.rows &&
    ![...map.obstacles, ...map.stations].some(
      (b) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h,
    )
  );
}
// 固定走廊演示：先进入中间通道，再到目标停靠点。不是最短路或优化调度。
export function demoRoute(map, from, to) {
  const start =
    typeof from === "string"
      ? map.stations.find((s) => s.id === from)?.dock
      : from;
  const end =
    typeof to === "string" ? map.stations.find((s) => s.id === to)?.dock : to;
  if (!start || !end) throw new Error("未找到工位");
  if (
    !walkable(map, start) ||
    !walkable(map, end) ||
    !Number.isInteger(map.corridorY) ||
    map.corridorY < 0 ||
    map.corridorY >= map.rows
  )
    throw new Error("起点、终点或示例通道配置无效");
  let p = { ...start };
  const route = [{ ...p }];
  const move = (key, value) => {
    while (p[key] !== value) {
      p[key] += Math.sign(value - p[key]);
      route.push({ ...p });
    }
  };
  move("y", map.corridorY);
  move("x", end.x);
  move("y", end.y);
  if (route.some((point) => !walkable(map, point)))
    throw new Error("示例通道被阻挡，请调整停靠点或地图通道后重置");
  return route;
}
export function energyResult(rows) {
  if (
    rows.some(
      (r) =>
        r.power === "" ||
        r.hours === "" ||
        r.power === null ||
        r.hours === null ||
        !Number.isFinite(Number(r.power)) ||
        !Number.isFinite(Number(r.hours)) ||
        Number(r.power) < 0 ||
        Number(r.hours) < 0 ||
        Number(r.hours) > 24,
    )
  )
    throw new Error("请填写有效参数：功率 ≥ 0，单日运行时间为 0–24 小时。");
  const items = rows.map((r) => ({
    ...r,
    kwh: Number(r.power) * Number(r.hours),
  }));
  const total = items.reduce((s, r) => s + r.kwh, 0);
  if (!Number.isFinite(total))
    throw new Error("计算结果超出有效数值范围，请减小参数。");
  return { items, total };
}
export function taskFromVision(result) {
  if (!["clear", "suspected"].includes(result.decision)) return null;
  return {
    from: "inspection",
    to: result.decision === "clear" ? "processing" : "review",
    source: "vision",
    inspectionId: result.id,
  };
}
export function aggregateSales(rows, grain) {
  const groups = new Map();
  for (const r of rows) {
    let key = r.date;
    if (grain === "month") key = r.date.slice(0, 7);
    if (grain === "week") {
      const d = new Date(r.date + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      key = d.toISOString().slice(0, 10);
    }
    groups.set(key, (groups.get(key) || 0) + r.sales);
  }
  return [...groups].map(([date, sales]) => ({ date, sales }));
}
