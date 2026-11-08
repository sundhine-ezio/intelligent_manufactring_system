# 课程软件代码

北京理工大学智能制造工程

- `frontend/`：原有 Vue 前端，任务 5 已接入 OpenCV API；其余任务保持原演示实现。
- `backend/`：任务 5 物体识别 HTTP 服务、识别核心、评价脚本。
- `任务5_OpenCV物体识别技术文档.md`：原理、使用与评价说明。

从项目根目录运行 `python3 code/backend/server.py`；另一个终端执行 `cd code/frontend && npm start`，访问 `http://127.0.0.1:5173/#/vision`。缺少 Python 依赖时先执行 `python3 -m pip install -r code/backend/requirements.txt`。
