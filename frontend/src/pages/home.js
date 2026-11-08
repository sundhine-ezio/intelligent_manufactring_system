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
      <div>
        <span class="overline">知造 · SMART FACTORY</span>
        <h2>从感知到决策，连接制造现场</h2>
        <p>围绕物流、质量、设备、订单与能源，探索智能工厂的五个业务模块。</p>
        <router-link to="/agv" class="btn btn-primary"
          >进入调度工作台 <app-icon name="arrow" :size="17"
        /></router-link>
      </div>
      <div class="factory-mark" aria-hidden="true">
        <svg viewBox="0 0 310 150">
          <g fill="none" stroke="#9db5d7" stroke-width="1.3">
            <path
              d="M15 110l130 25 145-47-130-24zM45 105V52l55 12v53M45 52l48-16 55 12-48 16m48-16v51M160 106V51l62 13v22M160 51l44-15 62 13-44 15m44-15v22M70 60V28l12 3v32M195 57V20l12 3v37"
            />
            <path
              d="M58 77l27 6m-27 7 27 6M174 75l30 6m-30 7 30 6M23 123l122 24 150-49"
              stroke-dasharray="4 5"
            />
          </g>
          <g fill="#4778bd">
            <circle cx="145" cy="135" r="4" />
            <circle cx="45" cy="105" r="3" />
            <circle cx="266" cy="71" r="3" />
          </g>
        </svg>
      </div>
    </section>
      <div class="section-heading">
      <h2>智能工厂功能模块 <span>MODULES</span></h2>
      <span class="muted">按任务进入，独立演示</span>
    </div>
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
        <div class="module-scene" aria-hidden="true"><img :src="'assets/scene-'+m.icon+'.svg'" alt="" /></div>
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
