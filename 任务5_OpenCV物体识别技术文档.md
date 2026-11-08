# 任务 5：用 OpenCV 识别彩色立方体

## 1. 本模块解决什么问题

用户上传图片，软件找出红、黄、蓝、绿立方体候选区域，输出颜色、目标框、像素中心和归一化中心。在明确使用现有 BlenderProc 相机和 0.5 m 直立立方体的条件下，还估算立方体中心的世界 XYZ。`code/frontend` 是 Vue 页面；`code/backend` 是本任务的 Python HTTP 服务；原始 36 张图片及标签仍留在 `cube_blenderproc/data/grid36`。本任务无需神经网络训练。

“识别”在这里指按颜色和形状找到候选区域，并不能证明任意红色物体一定是立方体。`className=cube_candidate` 正是这个含义。未找到目标时返回空列表，页面显示“未识别到目标立方体”。

## 2. 先认识图片、颜色与像素

数字图片是二维像素网格。`width=1280, height=960` 表示横向 1280 个、纵向 960 个像素；左上角是 `(0,0)`，`u/x` 向右，`v/y` 向下。PNG 的 RGB 每个像素含红、绿、蓝三个通道。OpenCV 读入后通常按 BGR 排列，所以程序先用 `cv2.cvtColor(image, cv2.COLOR_BGR2HSV)` 转换。

HSV 把颜色近似拆成色相 H、饱和度 S、明度 V。在本数据集，四种材质色相区分明显。程序用 `cv2.inRange` 为每种颜色做二值掩码：符合阈值的像素为白，其余为黑。红色跨越色相环起点，因此分成两段阈值。阈值在 `vision.py` 的 `COLOR_RANGES`，饱和度下限 80、明度下限 55，减少灰色背景被误选。阈值是规则参数，不是学出的模型权重。

## 3. 从颜色像素到一个目标

阈值后的掩码先经过 3×3 形态学开运算，去掉零星噪点；`cv2.findContours` 找连通区域轮廓；小于 100 像素²或宽高小于 8 像素的区域被过滤。`cv2.boundingRect` 求最小水平目标框 `(x,y,w,h)`；轮廓矩 `cv2.moments` 给出可见色块的像素质心 `(u,v)`，再除以图片宽高得到归一化坐标。每种颜色和每个轮廓可形成一个目标，因此接口支持多目标。

目标框覆盖的是**可见色块**，不是立方体三维外形。色彩阴影、侧面、遮挡会改变框与质心。OpenCV 在这种颜色单纯、背景受控、物体不重叠的合成场景很合适；遇到复杂背景、同色干扰、强反光或真实相机的白平衡变化，应重新调阈值并评价，必要时再考虑训练检测模型。

## 4. 从二维到三维：条件和计算

单个像素只确定相机发出的一条视线，沿视线有无数个可能的三维点。因此普通单张 RGB 图片不能直接给可靠 XYZ。本数据集另有已知条件：相机固定在世界坐标 `(0,-3,3)` m，光轴指向世界 `+Y`；焦距 `fx=fy=600` 像素，主点 `(639.5,479.5)`；立方体边长 0.5 m，直立，中心高度固定为 `Z=3` m，图片为原始 1280×960 且无镜头畸变。

近似用目标框高度 `h` 推出前表面深度：`d_front ≈ fy × 0.5 / h`，立方体中心深度 `d_center ≈ d_front + 0.25`。再用框的水平中心 `u` 估算 `X ≈ (u-cx) × d_center / fx`；世界 `Y ≈ -3 + d_center`；`Z=3`。返回单位 m、坐标系 `Blender world`。这里用可见框替代几何投影，因透视和可见侧面会有误差；这是**估算**，不能直接给机械臂做安全抓取。

选择“按 BlenderProc 相机和 0.5 m 立方体估算 XYZ”后，前端会传 `calibration=grid36`。后端不检查图片是否属于已有数据集，而是对每张符合 1280×960 尺寸的图片按相同几何公式估算。因此，使用相同相机内外参、分辨率、立方体尺寸和姿态生成的新图片也能得到 XYZ。未选择该条件，或分辨率不符时，`position=null`。勾选状态在上传新图后保留；图片尺寸本身不能证明相机条件，若生成参数变了，应取消勾选并重新标定。

## 5. 数据与评价

`dataset.json` 描述相机、颜色、尺寸和样本；每张 `metadata.json` 给真实颜色、像素框与世界中心；`splits.json` 按横向位置分组：train=x1、val=x0、test=x2，每组 12 张。推理代码只读取 RGB；`evaluate.py` 才读取标签，并在 test 组计算结果。

当前 12 张 test 图：12/12 恰好检出一个目标、12/12 颜色正确；平均框 IoU=0.9907；世界 X、Y、Z 平均绝对误差分别 0.0256、0.0132、0 m。IoU 是交并比，1 表示框完全重合。Z=0 误差只是因为该场景中心高度固定，程序直接使用 3 m，**不是从图片恢复出了高度**。这些测试图的部分颜色分布在设置宽泛阈值前曾被人工查看，因此结果不能当作严格盲测；样本也仅有 12 张、每张一个目标。多目标与真实照片的准确率尚未评价，不能宣称 100% 通用准确率。

复现：`python3 code/backend/evaluate.py`。逐样本记录保存在 `code/backend/evaluation.json`。

## 6. API 与运行

在项目根目录依次运行：

```bash
python3 -m pip install -r code/backend/requirements.txt
python3 code/backend/server.py
```

另开终端：

```bash
cd code/frontend
npm ci
npm start
```

打开 `http://127.0.0.1:5173/#/vision`，切到任务 05。页面列出 test 组样例，也可上传 PNG/JPEG（最大 10 MB、2500 万像素）。BlenderProc 条件初始勾选；选择样例或上传新图都保留用户当前的勾选状态。点击“开始识别”后显示框、颜色、中心、条件性 XYZ。后端监听 `127.0.0.1:8000`，仅供本机课程演示。

- `GET /api/health/`：服务状态。
- `GET /api/vision/object/samples/`：12 张测试样例元数据。
- `GET /api/vision/object/samples/{id}/image/`：测试图片。
- `POST /api/vision/object/detect/`：`multipart/form-data`，`file` 必填；`calibration=grid36` 可选。返回 `{width,height,targets,source,calibration,note}`。每个目标含 `objectId,color,bbox,center,centerNormalized,position`。OpenCV 规则不产生可校准的置信度，所以 `confidence=null`。

## 7. 阅读代码的顺序

先看 `backend/vision.py` 的 `detect`，跟着“解码 → HSV → 掩码 → 轮廓 → 框和中心”走；再看 `estimate_position` 的条件和公式；接着看 `server.py` 如何把上传文件送入 `detect`；最后看 `frontend/src/services.js` 的 `objectVision` 与 `frontend/src/pages/vision.js` 如何发请求、显示结果。`evaluate.py` 演示怎样用标签量化效果。

参考：[OpenCV 的 HSV 阈值教程](https://docs.opencv.org/4.x/da/d97/tutorial_threshold_inRange.html)、[轮廓与目标框教程](https://docs.opencv.org/4.x/da/d0c/tutorial_bounding_rects_circles.html)、[相机针孔模型文档](https://docs.opencv.org/4.13.0/d9/d0c/group__calib3d.html)。
