import { Icon, Chart, PageHead, Guide, Notice, modules } from "./components.js";
import Home from "./pages/home.js";
import Agv from "./pages/agv.js";
import Vision from "./pages/vision.js";
import Orders from "./pages/orders.js";
import Energy from "./pages/energy.js";
import { Monitor, Help } from "./pages/info.js";
import { config } from "./config.js";
import DesignStatic, { isStaticDesignRoute } from "./design-static.js";
const routes = [
  { path: "/", component: Home, meta: { title: "工作台" } },
  { path: "/agv", component: Agv, meta: { title: "AGV 调度" } },
  { path: "/vision", component: Vision, meta: { title: "视觉检测" } },
  { path: "/orders", component: Orders, meta: { title: "订单预测" } },
  { path: "/energy", component: Energy, meta: { title: "能源节约" } },
  { path: "/monitor", component: Monitor, meta: { title: "设备状态监测" } },
  { path: "/guide", component: Help, meta: { title: "使用说明" } },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];
const router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});
router.afterEach((to) => {
  document.title = to.meta.title + " · 知造";
});
const app = Vue.createApp({
  data: () => ({ modules, mode: config.mode, globalError: "", menuOpen: false, designActive: false, visionTab: "surface" }),
  errorCaptured(e) {
    this.globalError = "页面操作发生异常，请刷新后重试。" + e.message;
    return false;
  },
  computed: {
    staticDesign() { return isStaticDesignRoute(this.$route.path); },
    designTop() { return ({"/agv":"15.2%","/vision":"24.8%","/orders":"18%","/energy":"16%"})[this.$route.path] || "8%"; },
  },
  watch: { "$route.path"() { this.designActive=false; this.visionTab="surface"; } },
  methods: {
    async activateDesign(action) {
      this.designActive=true;
      await this.$nextTick();
      const targets={
        "new-agv":".map-panel .btn-row button:nth-child(1)",
        "new-task":".map-panel .btn-row button:nth-child(2)",
        "run":".map-panel .btn-row button:nth-child(3)",
        "reset":".map-panel .btn-row button:nth-child(4)",
        "process":".vision-controls .btn-primary",
        "detect":".vision-controls .btn-primary",
        "predict":".forecast-panel .btn-primary",
        "calculate":".energy-actions .btn-primary",
      };
      if(targets[action]) {
        let button;
        for(let attempt=0;attempt<120;attempt++) {
          button=this.$el.querySelector(".design-active-shell "+targets[action]);
          if(button && !button.disabled) break;
          await new Promise(resolve=>requestAnimationFrame(resolve));
        }
        if(button && !button.disabled) button.click();
      }
    },
    async switchVision(tab) {
      this.visionTab=tab;
      await this.$nextTick();
      this.$el.querySelector(".app-shell .page-tabs button:nth-child("+(tab==="objects"?2:1)+")")?.click();
    },
  },
  template: /* HTML */ `<div class="app-root">
    <design-static v-if="staticDesign" :path="$route.path" :vision-tab="visionTab" @activate="activateDesign" @switch-vision="switchVision" @reset="designActive=false" />
    <div class="app-shell" :class="{'menu-open':menuOpen,'static-design-shell':staticDesign&&!designActive,'design-active-shell':staticDesign&&designActive}" :style="{'--design-content-top':designTop}">
    <button class="mobile-menu-toggle" type="button" :aria-expanded="menuOpen" aria-controls="main-sidebar" @click="menuOpen=!menuOpen">{{menuOpen?'关闭菜单':'菜单'}}</button>
    <button v-if="menuOpen" class="mobile-menu-scrim" type="button" aria-label="关闭导航" @click="menuOpen=false"></button>
    <aside id="main-sidebar" class="sidebar" @click="menuOpen=false">
      <router-link to="/" class="brand"
        ><img src="assets/favicon.svg" alt="" />
        <div>
          <strong>知造 <span>FACTORY</span></strong
          ><small>智能工厂演示平台</small>
        </div></router-link
      >
      <div class="nav-label">工作空间</div>
      <router-link to="/" class="nav-item" exact-active-class="active"
        ><app-icon name="home" /><span>总览工作台</span></router-link
      >
      <div class="nav-label modules-label">业务模块</div>
      <nav aria-label="业务模块">
        <router-link
          v-for="m in modules"
          :to="m.path"
          class="nav-item"
          active-class="active"
          ><app-icon :name="m.icon" /><span>{{m.name}}</span></router-link
        >
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-decor" aria-hidden="true"><img src="assets/sidebar-decor.svg" alt="" /></div>
        <div class="edition">
          <span class="dot blue-dot"></span>课程项目 · 前端 v1.0<small
            >制造系统感知分析与决策</small
          >
        </div>
        <router-link to="/guide" class="nav-item" active-class="active"
          ><app-icon name="help" /><span>使用说明</span></router-link
        >
      </div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <div class="factory-canopy" aria-hidden="true"></div>
        <div class="breadcrumb-text">
          智能工厂 <span>/</span> <b>{{$route.meta.title}}</b>
        </div>
        <div class="topbar-right">
          <span class="environment"
            ><i class="dot green-dot"></i
            >{{mode==='mock'?'本地演示模式':'后端接口模式'}}</span
          ><span class="divider"></span><span class="avatar">智</span
          ><span>课程项目组</span>
        </div>
      </header>
      <main class="main-content">
        <app-notice :message="globalError" /><router-view />
      </main>
      <footer class="app-footer">
        <span>知造 · 制造系统感知分析与决策</span
        ><span>课程演示软件 / 非生产系统</span>
      </footer>
    </div>
  </div></div>`,
});
app.component("design-static", DesignStatic);
app.component("app-icon", Icon);
app.component("app-chart", Chart);
app.component("page-head", PageHead);
app.component("module-guide", Guide);
app.component("app-notice", Notice);
app.use(router);
app.mount("#app");
