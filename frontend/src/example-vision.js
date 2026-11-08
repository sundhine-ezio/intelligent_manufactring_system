// 仅供两张内置样例的教学预览：均值滤波 → 对比度拉伸 → Sobel → 连通区域。
// 通用上传接口尚未接入；候选区域不能直接用于质量判定。
export async function processExample(url, threshold, minArea) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const w = img.naturalWidth,
    h = img.naturalHeight,
    c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const input = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h),
    smooth = new Float32Array(w * h),
    edges = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++)
    gray[i] =
      input.data[i * 4] * 0.299 +
      input.data[i * 4 + 1] * 0.587 +
      input.data[i * 4 + 2] * 0.114;
  let low = 255,
    high = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let sum = 0,
        n = 0;
      for (let j = -1; j <= 1; j++)
        for (let k = -1; k <= 1; k++) {
          const xx = x + k,
            yy = y + j;
          if (xx >= 0 && xx < w && yy >= 0 && yy < h) {
            sum += gray[yy * w + xx];
            n++;
          }
        }
      const v = sum / n;
      smooth[y * w + x] = v;
      low = Math.min(low, v);
      high = Math.max(high, v);
    }
  for (let i = 0; i < smooth.length; i++)
    smooth[i] = ((smooth[i] - low) * 255) / Math.max(1, high - low);
  const at = (x, y) => smooth[y * w + x];
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -at(x - 1, y - 1) +
        at(x + 1, y - 1) -
        2 * at(x - 1, y) +
        2 * at(x + 1, y) -
        at(x - 1, y + 1) +
        at(x + 1, y + 1);
      const gy =
        -at(x - 1, y - 1) -
        2 * at(x, y - 1) -
        at(x + 1, y - 1) +
        at(x - 1, y + 1) +
        2 * at(x, y + 1) +
        at(x + 1, y + 1);
      edges[y * w + x] = Math.min(255, Math.hypot(gx, gy));
    }
  const render = (values) => {
    const d = ctx.createImageData(w, h);
    for (let i = 0; i < values.length; i++) {
      d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = values[i];
      d.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(d, 0, 0);
    return c.toDataURL("image/png");
  };
  const preprocessed = render(smooth),
    edgeImage = render(edges),
    visited = new Uint8Array(w * h),
    boxes = [];
  for (let i = 0; i < edges.length; i++) {
    if (visited[i] || edges[i] < threshold) continue;
    const queue = [i];
    visited[i] = 1;
    let xmin = w,
      ymin = h,
      xmax = 0,
      ymax = 0;
    for (let q = 0; q < queue.length; q++) {
      const p = queue[q],
        x = p % w,
        y = Math.floor(p / w);
      xmin = Math.min(xmin, x);
      xmax = Math.max(xmax, x);
      ymin = Math.min(ymin, y);
      ymax = Math.max(ymax, y);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx,
            yy = y + dy,
            j = yy * w + xx;
          if (
            xx >= 0 &&
            xx < w &&
            yy >= 0 &&
            yy < h &&
            !visited[j] &&
            edges[j] >= threshold
          ) {
            visited[j] = 1;
            queue.push(j);
          }
        }
    }
    if (queue.length >= minArea)
      boxes.push({
        x: xmin,
        y: ymin,
        width: xmax - xmin + 1,
        height: ymax - ymin + 1,
        area: queue.length,
      });
  }
  return {
    preprocessed,
    edgeImage,
    boxes: boxes.sort((a, b) => b.area - a.area).slice(0, 8),
    totalRegions: boxes.length,
  };
}
