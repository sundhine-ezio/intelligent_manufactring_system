# 前端接口约定 v1

本文件区分“当前适配层已调用”和“后续算法接入预留”。Django/MySQL 服务尚未实现。

## 通用约定

- API 根路径：`http://127.0.0.1:8000/api/`，路径末尾保留 `/`，贴近 Django 路由习惯。
- 当前 `src/config.js` 的 mode 为 `mock`。改成 `http` 时使用 Axios；失败会显示错误，不会回退演示数据。
- JSON 成功响应直接返回业务对象或列表，不额外包裹 data。错误用适当的 HTTP 4xx/5xx，响应 `{ "message": "可读的失败说明" }`。
- 图片使用 multipart/form-data，字段 file 和 parameters（JSON 字符串）；禁止把人工标签作为预测结果返回。
- 正式接入需配置 Django 对本地前端来源的 CORS、上传校验和认证/CSRF策略。不要照搬 demo 的所有开发配置。
- 所有时间序列日期使用 YYYY-MM-DD。网格、像素、物理坐标分开；未知数据使用 null，不用 0 假装有效值。
- 本版 HTTP 适配只覆盖数据读写边界。AGV 本地步进和视觉示例是前端演示逻辑，正式算法接入时需按以下预留契约接管。

## 当前数据读取与计算入口

| 方法与路径 | 请求 | 响应 |
|---|---|---|
| GET agv/scenario/ | 无 | `{ map, agvs, tasks }` |
| GET vision/samples/ | 无 | 内置表面样例列表 |
| GET vision/objects/sample/ | 无 | `{ url, width, height, source, objects }` |
| GET orders/history/ | 当前无参数；一次读取前端子集 | `{ source, stores, items, dates, series }` |
| POST orders/forecast/ | `{ store, item, history, method, horizon }` | `{ points, source, method, metrics, note }` |
| GET energy/devices/ | 无 | 设备参数列表 |
| POST energy/calculate/ | `{ devices: [...] }` | `{ items, total }` |
| POST vision/detect/ | file、parameters | 视觉结果契约，见后文；当前界面仅为待接入占位 |

### AGV 场景与地图

map 与 src/map-config.js 同形。必需字段 cols、rows、corridorY、stations、obstacles。station 为 `{ id, name, short, x, y, w, h, dock: {x,y}, color }`。id 稳定，dock 可通行。home、charging、maintenance 为现有演示状态机使用的保留工位。

初始车辆：`{ "id": "AGV-01", "battery": 92, "wear": 12 }`。battery 和 wear 单位为百分比，0–100。初始化会在 home 停靠点建立位置、状态和路线。

初始任务：`{ "id": "T-001", "from": "source", "to": "processing", "status": "待分配" }`。本版新增车辆和任务在内存中完成，不写入服务端。

### 后续 AGV 算法预留

```json
{
  "request": {
    "vehicles": [{"id":"AGV-01","position":{"x":2,"y":10},"battery":92}],
    "tasks": [{"id":"T-001","from":"source","to":"processing"}],
    "map": "与地图配置相同的对象"
  },
  "response": {
    "source": "algorithm",
    "assignments": [{"agvId":"AGV-01","taskIds":["T-001"]}],
    "routes": [{"agvId":"AGV-01","taskId":"T-001","points":[{"x":2,"y":10},{"x":2,"y":9}]}],
    "metrics": {"totalDistance":null,"makespan":null}
  }
}
```

预留 `POST agv/dispatch/` 用于任务排序和车辆分配，`POST agv/route/` 用于路径规划。本版未调用。路径 points 必须完整连续，并包含当前位置与实际终点；上面的两点仅用于说明字段。metrics 只有真正计算后才返回数值，时间须另注明模拟步或秒。

当前顺序分配和固定走廊不是该优化接口的实现。后续多车路线若涉及避碰，还要增加时间信息，不能只返回几条静态几何路线。

### 视觉输入输出

人工样例：`{ id, name, url, width, height, boxes, provenance }`。boxes 的 x/y 是左上角，width/height 为框尺寸，均以像素计；classId 保留原标签编号，其名称映射须先核验。

`parameters` 示例：`{"task":"surface","threshold":85,"minArea":25}`。threshold 为边缘强度阈值；minArea 为连通边缘像素数量阈值，不是物理面积。

后续表面检测契约：

```json
{
  "id": "inspection-001",
  "source": "algorithm",
  "width": 200,
  "height": 200,
  "preprocessed": "/media/results/001-filter.png",
  "edgeImage": "/media/results/001-edge.png",
  "boxes": [{"x":12,"y":20,"width":35,"height":42,"area":80}],
  "totalRegions": 1,
  "decision": "unknown"
}
```

decision 支持 unknown、suspected、clear。clear 表示当前规则没有发现超过阈值的候选，不等价于经过质量标准认证的合格。图片地址需返回完整可访问 URL，或由适配层补齐后端域名。本版任意上传的 mock 请求明确失败；HTTP 返回结果的校验、展示和判定解释需在接入算法时完成，不应只改 mode 就宣称真实视觉已完成。

物体定位预留 `POST vision/locate/`：输入图片与可选标定编号，输出 `{ source, width, height, objects }`，每个 object 包含 id、color、像素框、centerPx。`world` 未标定时为 null；有标定时返回 `{ x,y,z,unit,frame,calibrationId }`。不要把像素直接当成毫米。

### 视觉到搬运任务的预留

`integration.taskFromVision({id,decision})` 仅生成任务建议：

- suspected → inspection 到 review；
- clear → inspection 到 processing；
- unknown 或失败 → null，等待人工确认。

它不自动派车，也不修改地图。本版尚未调用。正式联动时须由人工确认或明确的业务规则触发，并保留 inspectionId 以便追溯。

### 销量与预测

history 响应示例：

```json
{"source":"真实历史子集","stores":[1,2],"items":[1,2,3],"dates":["2013-01-01","2013-01-02"],"series":{"1:1":[13,11]}}
```

dates 必须升序，每个 series 数组与 dates 一一对应，不能错位。完整数据接入时建议在服务端按 store/item/start/end 查询，适配层转换为页面所需结构，避免一次下载全量 913,000 条。

预测请求 history 为 `[{date,sales}]`，horizon 为天数。当前 method 为 weekly（最近七日重复）、mean（最近二十八日均值）；这是界面演示标识，不是已完成的正式模型。

响应 points 与 history 同形，日期从历史最后一天的下一天开始。source 为 demo 或 algorithm，metrics 未评价时为 null；后续真实回测可返回 `{mae,rmse,testStart,testEnd}`。不得填造准确率，改动筛选会清空旧预测，避免混用不同商品或日期的结果。

### 能源

设备：`{id,name,group,power,hours}`。group 为设备或 AGV，power 的单位 kW，hours 为单日小时数（0–24）。

返回 items 为每台设备增加 kwh 的列表，total 为合计。缺失值、非数值、负值、超出 24 小时应报错；0 是有效值。总能耗为 0 时不计算占比。功率恒定是显式假设。

## 数据库后续职责

MySQL 后续保存工位配置、车辆信息、任务、检测记录和参数；原始图片保存为文件，表中记录路径与元数据。销量导入和索引设计留到后端阶段。本阶段不生成迁移或连接数据库。


## 已接入：任务 5 OpenCV API

任务 5 页面独立调用 `http://127.0.0.1:8000/api/vision/object/`，不受 `src/config.js` 的其他模块 mock/http 切换影响。`GET samples/` 列出 12 张 BlenderProc 测试图；`GET samples/{id}/image/` 获取图片；`POST detect/` 使用 multipart `file` 上传 PNG/JPEG，按需附 `calibration=grid36`。返回 `width,height,targets,source,calibration,note`；每个目标有 `objectId,className,color,confidence,bbox,center,centerNormalized,position`。`confidence` 为 null；选择 BlenderProc 场景参数且图片为 1280×960 时估算 XYZ，与文件是否属于旧数据集无关。详见 `../../任务5_OpenCV物体识别技术文档.md`。
