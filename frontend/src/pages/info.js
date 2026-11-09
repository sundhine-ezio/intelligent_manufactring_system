export const Monitor = {
  template: /* HTML */ `<div>
    <page-head
      eyebrow="CONDITION / 状态感知"
      title="设备状态监测"
      description="任务 06 · 从多变量运行数据判断设备状态。"
    />
    <section class="panel monitor-placeholder">
      <span class="icon-tile violet"
        ><app-icon name="monitor" :size="34" /></span
      ><span class="pill neutral">规划中</span>
      <div class="monitor-scene"><pixel-art scene="monitor-hero" /></div>
      <h2>等待接入设备运行数据</h2>
      <p>
        当前目录中的缺陷图片与销量数据无法直接用于设备状态监测。<br />该模块需要另行确定传感器指标、数据来源和状态判断规则。
      </p>
      <div class="monitor-steps">
        <div>
          <b>01</b>
          <h3>确定监测指标</h3>
          <p>如温度、振动、电流<br />指标与具体设备对应</p>
        </div>
        <div>
          <b>02</b>
          <h3>接入历史与在线数据</h3>
          <p>区分真实数据与模拟回放<br />保留采样时间和单位</p>
        </div>
        <div>
          <b>03</b>
          <h3>展示状态判断</h3>
          <p>规则库或分类模型<br />输出正常、磨损等状态</p>
        </div>
      </div>
    </section>
    <module-guide
      input="待确定的设备多变量传感器数据。"
      process="从历史数据确定指标与规则，再判断当前状态。"
      output="指标曲线、状态与异常提醒，当前均未接入。"
      answer="AGV 页面中的模拟磨损数值不等于完成了设备状态监测任务；需另有可解释的数据处理和状态判断流程。"
    />
  </div>`,
};
export const Help = {
  template: /* HTML */ `<div>
    <page-head
      eyebrow="GUIDE / 使用说明"
      title="演示与学习指南"
      description="按模块走通操作，再逐步理解数据、算法与接口。"
    />
    <div class="help-layout"><section class="panel help-panel">
      <h2>建议演示顺序</h2>
      <ol>
        <li><b>首页：</b>介绍五个业务模块及课程任务对应关系。</li>
        <li>
          <b>AGV：</b
          >新增小车与搬运任务，开始运行，选中小车观察路径，暂停后查看状态，最后重置。
        </li>
        <li>
          <b>视觉：</b
          >选择内置样例，对比四步处理结果；叠加人工标注；上传自己的图片，说明通用检测尚未接入。切换物体定位页，说明像素坐标与实际坐标的区别。
        </li>
        <li>
          <b>订单：</b
          >切换商店、商品与时间粒度，生成两种示例预测，说明真实历史与预测示例的边界。
        </li>
        <li>
          <b>能源：</b
          >修改功率与时长，重新计算并手工核对；设为零或留空，观察不同处理结果。
        </li>
        <li><b>监测：</b>说明后续需要的传感器数据与判断规则。</li>
      </ol>
    </section>
    <section class="panel help-panel">
      <h2>答辩时需要讲清楚的区别</h2>
      <div class="help-grid">
        <div>
          <h3>演示和算法</h3>
          <p>
            界面走通不等于算法已完成。AGV
            是固定通道演示；视觉样例仅做简化处理；预测规则还没有经过回测。
          </p>
        </div>
        <div>
          <h3>标签和预测</h3>
          <p>
            人工标签用于参考与评价，不能读取标签后宣称是识别输出。蓝色候选框与橙色标注框有不同含义。
          </p>
        </div>
        <div>
          <h3>像素和空间</h3>
          <p>
            图片上的坐标以像素计。实际抓取还需要相机标定、坐标转换与场景约束。
          </p>
        </div>
        <div>
          <h3>销量和订单</h3>
          <p>
            sales
            是销售数量。用于工厂需求预测是一种业务映射，排产还需要工艺与产能参数。
          </p>
        </div>
      </div>
    </section></div>
    <div class="guide-conveyor"><pixel-art scene="conveyor" /></div>
    <section class="info-strip">
      <app-icon name="file" /><span
        >项目中的 README.md、docs/API.md 和 docs/DEMO.md
        提供启动说明、接口约定与答辩笔记。AI
        辅助内容与人工验证需在结课材料中说明。</span
      >
    </section>
  </div>`,
};
