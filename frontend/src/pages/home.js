import { modules } from "../components.js";
export default {
  data: () => ({ modules }),
  template: /* HTML */ `<div>
    <page-head
      eyebrow="WORKSPACE / 工作台"
      title="智能工厂总览"
      description="制造系统感知、分析与决策 · 课程演示平台"
      ><span class="pill">前端演示版 v1.0</span></page-head
    >
    <section class="home-intro">
      <pixel-art scene="factory" />
    </section>
    <div class="module-grid">
      <router-link
        v-for="(m,i) in modules"
        :key="m.path"
        :to="m.path"
        class="module-card"
        ><div class="module-top">
          <span :class="['icon-tile',m.color]"
            ><app-icon :name="m.icon" :size="25" /></span
          ><span class="module-num">0{{i+1}}</span>
        </div>
        <div class="module-scene" aria-hidden="true"><pixel-art :scene="m.icon" /></div>
        <h3>{{m.name}} <span v-if="m.path==='/monitor'" class="module-pending">规划中</span></h3>
        <p>{{m.desc}}</p>
        <div class="module-bottom">
          <span>{{m.tag}}</span
          ><span class="module-enter"
            ><span>{{m.path==='/monitor'?'查看规划':'进入模块'}}</span
            ><app-icon name="arrow" :size="16"
          /></span></div
      ></router-link>
    </div>
    <div class="home-bottom">
      <section class="panel workflow">
        <div class="panel-title">
          <h3>业务协同路径</h3>
          <span class="pill neutral">联动待接入</span>
        </div>
        <div class="flow">
          <span>订单需求</span><i>→</i><span>AGV 搬运</span><i>→</i
          ><span>视觉检测</span><i>→</i><span>加工 / 复检</span>
        </div>
        <p class="muted">模块先独立运行，后续通过工位编号和搬运任务连接。</p>
      </section>
      <section class="panel project-note">
        <span class="overline">关于当前版本</span>
        <p>
          操作界面与示例流程已开放。各模块会明确标注演示数据、人工标注与待接入能力。
        </p>
        <router-link to="/guide"
          >查看使用说明 <app-icon name="arrow" :size="15"
        /></router-link>
      </section>
    </div>
  </div>`,
};
