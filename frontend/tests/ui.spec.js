import { test, expect } from "@playwright/test";
import fs from "node:fs";
test("AGV 任务执行到终点后完成并自动暂停", async ({ page }) => {
  await page.clock.install();
  await page.goto("/#/agv");
  await expect(page.getByText("T-001", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "开始", exact: true }).click();
  await page.clock.runFor(60000);
  await expect(page.locator(".task-panel .status.done")).toHaveCount(2);
  await expect(page.locator(".running-label")).toContainText("已暂停");
});
test("HTTP 接口失败时显示错误，不退回演示数据", async ({ page }) => {
  await page.route("**/src/config.js", route => route.fulfill({
    contentType: "text/javascript",
    body: 'export const config={mode:"http",apiBase:"http://127.0.0.1:8000/api/",timeout:1000};'
  }));
  await page.route("http://127.0.0.1:8000/**", route => route.abort());
  await page.goto("/#/agv");
  await expect(page.getByRole("alert")).toContainText("后端连接失败");
  await expect(page.locator(".factory-map")).toHaveCount(0);
});
test("首页、全部模块、两种 PC 分辨率以及离线资源", async ({
  page,
  context,
}) => {
  const errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:5173") &&
      !r.url().startsWith("data:") &&
      !r.url().startsWith("blob:")
    )
      external.push(r.url());
  });
  await context.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  for (const width of [1366, 1920]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
    for (const [route, title] of [
      ["/", "让工厂运行，一目了然。"],
      ["/agv", "AGV 调度工作台"],
      ["/vision", "视觉检测"],
      ["/orders", "订单预测"],
      ["/energy", "能源节约"],
      ["/monitor", "设备状态监测"],
      ["/guide", "演示与学习指南"],
    ]) {
      await page.goto("/#" + route);
      await expect(page.locator("h1")).toHaveText(title);
      if (route === "/orders")
        await expect(page.locator(".stat strong").first()).not.toHaveText(
          "0件",
        );
      if (route === "/vision")
        await expect(
          page.getByAltText("均值滤波与对比度增强结果"),
        ).toBeVisible();
      await expect(page.locator(".notice")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBeTruthy();
      if (["/", "/agv", "/vision", "/orders", "/energy"].includes(route))
        await page.screenshot({
          path:
            "test-results/" +
            (route === "/" ? "home" : route.slice(1)) +
            "-" +
            width +
            ".png",
          fullPage: true,
        });
    }
  }
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test("AGV 新建、执行、暂停、重置与离开页面", async ({ page }) => {
  await page.goto("/#/agv");
  await expect(page.getByText("T-001", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "新增小车", exact: true }).click();
  await expect(page.locator(".vehicle-tabs button")).toHaveCount(3);
  await page.getByRole("button", { name: "搬运任务", exact: true }).click();
  await page.selectOption("#task-from", "inspection");
  await page.selectOption("#task-to", "review");
  await page.getByRole("button", { name: "创建任务", exact: true }).click();
  await expect(page.getByText("T-003", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "开始", exact: true }).click();
  await expect(page.locator("polyline")).toHaveCount(1);
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  const steps = await page.locator(".running-label").textContent();
  await page.waitForTimeout(700);
  await expect(page.locator(".running-label")).toHaveText(steps);
  await page.getByRole("button", { name: "重置", exact: true }).click();
  await expect(page.locator(".vehicle-tabs button")).toHaveCount(2);
  await expect(page.getByText("T-003", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "开始", exact: true }).click();
  await page.getByRole("link", { name: "能源节约", exact: true }).click();
  await page.getByRole("link", { name: "AGV 调度", exact: true }).click();
  await expect(page.locator(".running-label")).toHaveText("已暂停 · 0 步");
});
test("图片格式、大小、损坏与上传后不伪造结果", async ({ page }) => {
  await page.goto("/#/vision");
  await expect(page.getByAltText("均值滤波与对比度增强结果")).toBeVisible();
  const input = page.locator("input[type=file]");
  await input.setInputFiles({
    name: "bad.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("bad"),
  });
  await expect(page.getByRole("alert")).toContainText("PNG 或 JPEG");
  await input.setInputFiles({
    name: "big.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole("alert")).toContainText("10 MB");
  await input.setInputFiles({
    name: "broken.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("invalid image"),
  });
  await expect(page.getByRole("alert")).toContainText("无法解码");
  await input.setInputFiles("assets/crazing_1.jpg");
  await expect(page.getByText("已上传图片", { exact: true })).toBeVisible();
  await expect(page.getByAltText("均值滤波与对比度增强结果")).toHaveCount(0);
  await page.getByRole("button", { name: "尝试检测", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("尚未接入");
  await page.route("**/api/vision/object/samples/", route => route.fulfill({json: [{id:"test",name:"测试图",url:"assets/objects.svg",width:640,height:420}]}));
  await page.route("**/api/vision/object/detect/", route => route.fulfill({json: {width:640,height:420,targets:[{objectId:"cube-01",color:"red",bbox:{x:10,y:20,w:30,h:40},center:{x:25,y:40},centerNormalized:{x:0.039,y:0.095},position:null}],note:"测试结果"}}));
  await page.getByRole("button", { name: "任务 05 · 物体定位" }).click();
  await page.getByRole("button", { name: "开始识别" }).click();
  await expect(page.locator(".object-table tbody tr")).toHaveCount(1);
  await expect(page.getByText("不可用", {exact:true})).toBeVisible();
});
test("订单筛选与预测失效、日期检查", async ({ page }) => {
  await page.goto("/#/orders");
  await expect(page.locator("#item option")).toHaveCount(3);
  const first = await page.locator(".stat strong").first().textContent();
  await page.selectOption("#item", "2");
  await expect(page.locator(".stat strong").first()).not.toHaveText(first);
  await page.getByRole("button", { name: "生成示例预测", exact: true }).click();
  await expect(page.getByText("示例已生成", { exact: true })).toBeVisible();
  await page.selectOption("#store", "2");
  await expect(page.getByText("示例已生成", { exact: true })).toHaveCount(0);
  await page.fill("#date-start", "2017-12-31");
  await page.fill("#date-end", "2017-01-01");
  await expect(page.getByRole("alert")).toContainText("开始日期不能晚于");
});
test("能源可复算、空值报错与零值不伪造占比", async ({ page }) => {
  await page.goto("/#/energy");
  await expect(page.locator(".stat strong").first()).toContainText("81.70");
  await page
    .getByRole("spinbutton", { name: "加工设备 A功率", exact: true })
    .fill("10");
  await page.getByRole("button", { name: "计算全部设备能耗" }).click();
  await expect(page.locator(".stat strong").first()).toContainText("96.70");
  await page
    .getByRole("spinbutton", { name: "加工设备 A功率", exact: true })
    .fill("");
  await page.getByRole("button", { name: "计算全部设备能耗" }).click();
  await expect(page.getByRole("alert")).toContainText("有效参数");
  for (const input of await page.locator("input[type=number]").all())
    await input.fill("0");
  await page.getByRole("button", { name: "计算全部设备能耗" }).click();
  await expect(page.locator(".stat strong").first()).toContainText("0.00");
  await expect(
    page.getByText("当前预计能耗为 0，无占比可展示。"),
  ).toBeVisible();
});
