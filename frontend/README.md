# 知造 · 智能工厂演示平台

课程项目的响应式前端。任务 5 已接入同级 `../backend` 的 OpenCV 本地 API；其他任务仍按原演示方式运行。所有页面直接使用 Vue 控件显示和操作；设计图只提供局部装饰插画。桌面端和手机端使用同一套页面与数据逻辑。设计说明见 [实施说明](docs/PIXEL_UI_IMPLEMENTATION.md)。

## 打开软件

本机依赖已安装。双击本目录中的 **启动前端.cmd**，保持窗口打开，再在浏览器访问：

**http://127.0.0.1:5173**

任务 5 还需先在项目根目录运行 `python3 code/backend/server.py`。原理、依赖和评价见 [任务 5 技术文档](../任务5_OpenCV物体识别技术文档.md)。

也可以在 PowerShell 中执行：

```powershell
cd "项目目录\code\frontend"
npm.cmd start
```

关闭服务：在启动窗口按 Ctrl+C。不要直接双击 index.html；页面会读取本地 JSON，需要通过本地 HTTP 服务打开。

如果提示端口已占用，先尝试访问已有页面；也可以使用其他端口：

```powershell
$env:PORT = "5174"
npm.cmd start
```

对应地址变为 http://127.0.0.1:5174。

## 换一台电脑

安装 Node.js（建议 22 或更高版本），复制整个 frontend 文件夹，在该文件夹执行一次：

```powershell
npm.cmd ci
npm.cmd start
```

第一次安装需要网络。Vue、Bootstrap、Axios、ECharts 等依赖安装在 node_modules 中，演示时全部从本地加载，不需要外网，也不需要安装 MySQL。package-lock.json 固定依赖；请一起保留。普通软件依赖和测试工具均列在 package.json 中。

## 当前实现与边界

| 模块 | 已完成 | 尚未完成 |
|---|---|---|
| 首页 | 像素工厂主题、五个模块入口、窄屏折叠菜单 | 场景插画为静态素材，未制作人物或机械臂精灵动画 |
| AGV | 增加车辆和任务、路线高亮、模拟取料运输、暂停重置、低电量充电和高磨损维护 | 最优任务排序、多车避碰、真实实时通信 |
| 表面检测 | 上传校验与预览；两张内置图片的均值滤波、增强、Sobel 与连通区域筛选；人工标签对照 | 通用图片检测、六类识别、质量合格判断与模型训练 |
| 物体定位 | BlenderProc 测试样例、OpenCV 颜色和目标框识别、像素中心、限定条件下的 XYZ 估算 | 真实照片的标定与验证、机械臂控制 |
| 设备监测 | 模块入口与后续数据规划 | 传感器数据、状态分类和实时曲线 |
| 订单预测 | 真实销量子集、日/周/月曲线、两个规则生成的预测示例 | 完整数据后端查询、回测、正式模型比较 |
| 能源 | 参数编辑、功率乘时间、设备与 AGV 占比、输入校验 | 实测用电、与订单或 AGV 状态的自动联动 |

页面中“样例”“人工标注”“演示预测”各有不同含义，不能在答辩中当成模型识别准确率或实际工业运行结果。任务不会跨刷新或页面切换持久化；重新进入 AGV 页面恢复初始场景，离开时关闭计时器。

## 数据来源

- `assets/sales-sample.json`：从目录原始销售 CSV 提取商店 1–2、商品 1–3 的完整日序列。共 6 条，每条 1,826 天，2013-01-01 至 2017-12-31。没有修改销量。
- `assets/crazing_1.jpg`、`assets/scratches_1.jpg`：复制自原始图像集。
- `assets/vision-samples.json`：从同名人工标签换算为像素框。不是预测框；仅在用户勾选后以橙色显示。
- `assets/factory-pixel-reference.png`：从项目根目录的像素工厂参考图复制，用于首页静态场景插画。
- 任务 5 样例通过本地 API 从 `cube_blenderproc/data/grid36` 读取测试划分；原有 `assets/objects.svg` 现在不用于任务 5。
- AGV 电量、磨损、设备功率与运行时间均为演示设定。能源模块中的 AGV 参数没有自动读取调度模块。

需要重新提取原始样例时，在当前项目目录关系下运行 `node scripts/prepare-assets.mjs`。该脚本只读取项目根目录的 `数据集/` 原始资料，写入 frontend/assets，不修改原件。

## 文件结构与学习顺序

```text
index.html              本地脚本加载与页面入口
server.mjs              仅服务静态文件的本地预览程序，不是 Django 后端
styles.css              统一布局和样式
pixel-theme.css         像素主题、页面配色与窄屏布局
src/app.js              侧栏、导航与路由
src/pages/              各模块 Vue Options API 页面
src/components.js       图表、图标、页头、答辩提示
src/services.js         演示数据服务与后续 HTTP 适配层
src/config.js           mock / http 模式和 API 地址
src/map-config.js       地图、工位、停靠点、障碍物
src/core.js             示例路线、能耗、时序汇总、视觉任务转换
src/example-vision.js   仅用于内置样例的简化图像处理
assets/                 可离线使用的数据与图片
docs/                   接口、演示与 AI 辅助说明
tests/                  核心行为和浏览器检查
```

先阅读页面与数据的关系，再阅读纯函数。Vue 页面用 data 保存状态，computed 计算展示值，methods 响应操作；mounted 加载数据，beforeUnmount 清理计时器或资源。

## 修改地图

编辑 src/map-config.js。工位 id 是稳定标识，不要随意更名。x/y/w/h 表示设备实体矩形，dock 是实体外的小车停靠点。坐标是整数网格，原点在左上，x 向右、y 向下。

示例路线固定经过 corridorY 中央通道；移动停靠点时，必须保证它到中央通道的竖直道路畅通。工位与固定设备矩形不能作为道路。页面会校验停靠点和执行路线；阻挡时报错并暂停，不会穿过障碍物。

保存配置后刷新浏览器，进入 AGV 页面重置。新增或移动工位无需修改任务字段；任务按工位 id 解析坐标。当前不支持动态编辑地图。停车点重叠车辆仅在绘制时稍作错开，真实演示坐标仍显示在侧栏。

## 检查方式

```powershell
npm.cmd test
npm.cmd run test:ui
```

浏览器检查默认使用 Windows 上的 Google Chrome。其他安装位置可设置 `$env:CHROME_PATH = "完整的浏览器路径"`。测试使用无界面浏览器，包含 1366×768、1920×1080 的页面截图、模块操作与异常输入检查。截图在 test-results 中，不属于交付业务数据。

详见 docs/API.md（接口）、docs/DEMO.md（演示与答辩）、docs/AI_USAGE.md（AI 辅助记录）。
