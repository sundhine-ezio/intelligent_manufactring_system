import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  const relative =
    pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = path.resolve(root, relative);
  const allowed = [
    "index.html",
    "styles.css",
    "pixel-theme.css",
    "src/",
    "assets/",
    "node_modules/vue/dist/",
    "node_modules/vue-router/dist/",
    "node_modules/bootstrap/dist/",
    "node_modules/axios/dist/",
    "node_modules/echarts/dist/",
  ];
  if (
    !file.startsWith(root + path.sep) ||
    !allowed.some((x) =>
      x.endsWith("/") ? relative.startsWith(x) : relative === x,
    )
  ) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    fs.createReadStream(file).pipe(res);
  });
});
server.on("error", (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? "端口已占用，请使用现有页面或设置 PORT 后重试。"
      : error.message,
  );
  process.exitCode = 1;
});
server.listen(Number(process.env.PORT || 5173), "127.0.0.1", () =>
  console.log(
    "智能工厂演示软件：http://127.0.0.1:" + (process.env.PORT || 5173),
  ),
);
