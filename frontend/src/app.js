import { Icon, Chart, PageHead, Guide, Notice, modules } from "./components.js";
import Home from "./pages/home.js";
import Agv from "./pages/agv.js";
import Vision from "./pages/vision.js";
import Orders from "./pages/orders.js";
import Energy from "./pages/energy.js";
import { Monitor, Help } from "./pages/info.js";
import { config } from "./config.js";
import PixelArt from "./pixel-art.js";
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
  document.title = to.meta.title + " · 智能工厂";
});
const app = Vue.createApp({
  data: () => ({ modules, mode: config.mode, globalError: "", menuOpen: false }),
  errorCaptured(e) {
    this.globalError = "页面操作发生异常，请刷新后重试。" + e.message;
    return false;
  },
  template: /* HTML */ `<div class="app-root">
    <div class="app-shell" :class="{'menu-open':menuOpen}">
    <button class="mobile-menu-toggle" type="button" :aria-expanded="menuOpen" aria-controls="main-sidebar" @click="menuOpen=!menuOpen">{{menuOpen?'关闭菜单':'菜单'}}</button>
    <button v-if="menuOpen" class="mobile-menu-scrim" type="button" aria-label="关闭导航" @click="menuOpen=false"></button>
    <aside id="main-sidebar" class="sidebar" @click="menuOpen=false">
      <router-link to="/" class="brand"
        ><img src="assets/favicon.svg" alt="" />
        <div>
          <strong class="pixel-brand">智能工厂</strong
          ><small>制造系统感知与决策</small>
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
        <div class="sidebar-decor" aria-hidden="true"><pixel-art scene="sidebar" /></div>
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
        <div class="factory-canopy" aria-hidden="true"><pixel-art v-for="n in 5" :key="n" scene="canopy" /></div>
        <div class="breadcrumb-text">
          智能工厂 <span>/</span> <b>{{$route.meta.title}}</b>
        </div>
        <div class="topbar-right">
          <span class="environment"
            ><i class="dot green-dot"></i
            >{{mode==='mock'?'本地演示模式':'后端接口模式'}}</span
          ><span class="divider"></span><span class="factory-badge pixel-brand">智能工厂</span
          ><span>课程项目组</span>
        </div>
      </header>
      <main class="main-content">
        <app-notice :message="globalError" /><router-view />
      </main>
      <footer class="app-footer">
        <span>智能工厂 · 制造系统感知分析与决策</span
        ><span>课程演示软件 / 非生产系统</span>
      </footer>
    </div>
  </div></div>`,
});
app.component("pixel-art", PixelArt);
app.component("app-icon", Icon);
app.component("app-chart", Chart);
app.component("page-head", PageHead);
app.component("module-guide", Guide);
app.component("app-notice", Notice);
app.use(router);
app.mount("#app");
