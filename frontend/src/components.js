const paths = {
  home: "M3 10l9-7 9 7v11h-6v-7H9v7H3z",
  agv: "M4 8h16v10H4z M7 8V5h10v3 M7 21v-3m10 3v-3M8 12h2m4 0h2",
  vision:
    "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  monitor: "M3 12h4l3-8 4 16 3-8h4",
  orders: "M4 3v18h17 M8 15l4-5 4 3 5-7",
  energy: "M13 2L4 14h7l-1 8 10-13h-7z",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  help: "M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5m0 3v1 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  file: "M5 2h9l5 5v15H5z M14 2v6h5M8 12h8m-8 4h6",
  check: "M5 12l4 4L19 6",
  upload: "M12 16V3m-5 5 5-5 5 5 M4 15v6h16v-6",
  pause: "M8 5v14M16 5v14",
  play: "M7 4l14 8-14 8z",
  reset: "M4 9a8 8 0 1 1 0 7M4 3v6h6",
  plus: "M12 4v16M4 12h16",
  box: "M3 7l9-5 9 5v10l-9 5-9-5z M3 7l9 5 9-5M12 12v10",
};
export const Icon = {
  props: ["name", "size"],
  template: /* HTML */ `<svg
    :width="size||20"
    :height="size||20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="path" />
  </svg>`,
  computed: {
    path() {
      return paths[this.name] || paths.box;
    },
  },
};
export const Chart = {
  props: ["option", "height"],
  template: /* HTML */ `<div
    class="chart"
    :style="{height:height||'300px'}"
    role="img"
    :aria-label="option?.aria?.label?.description||'数据图表'"
  ></div>`,
  mounted() {
    this.chart = window.echarts.init(this.$el);
    this.chart.setOption(this.option || {});
    this.observer = new ResizeObserver(() => this.chart?.resize());
    this.observer.observe(this.$el);
  },
  watch: {
    option: {
      deep: true,
      handler(value) {
        this.chart?.setOption(value, true);
      },
    },
  },
  beforeUnmount() {
    this.observer?.disconnect();
    this.chart?.dispose();
  },
};
export const PageHead = {
  props: ["eyebrow", "title", "description"],
  computed: {
    icon() {
      return ({"智能工厂总览":"home","AGV 调度工作台":"agv","视觉检测":"vision","订单预测":"orders","能源节约":"energy","设备状态监测":"monitor","演示与学习指南":"help"})[this.title] || "box";
    },
  },
  template: /* HTML */ `<div class="page-head">
    <div>
      <div class="eyebrow">{{eyebrow}}</div>
      <h1><app-icon :name="icon" :size="29" />{{title}}</h1>
      <p>{{description}}</p>
    </div>
    <slot />
  </div>`,
};
export const Guide = {
  props: ["input", "process", "output", "answer"],
  data: () => ({ open: false }),
  template: /* HTML */ `<div class="guide">
    <button class="guide-toggle" @click="open=!open" :aria-expanded="open">
      <span><app-icon name="help" :size="17" /> 模块说明与答辩提示</span
      ><span>{{open?'收起 −':'展开 ＋'}}</span>
    </button>
    <div v-if="open" class="guide-body">
      <p><b>输入：</b>{{input}}</p>
      <p><b>过程：</b>{{process}}</p>
      <p><b>输出：</b>{{output}}</p>
      <p><b>答辩提示：</b>{{answer}}</p>
    </div>
  </div>`,
};
export const Notice = {
  props: ["message"],
  template: /* HTML */ `<div v-if="message" class="notice" role="alert">
    {{message}}
  </div>`,
};
export const modules = [
  {
    path: "/agv",
    icon: "agv",
    name: "AGV 调度",
    tag: "任务 01–03",
    desc: "任务分配、车辆状态与工厂路径展示",
    color: "blue",
  },
  {
    path: "/vision",
    icon: "vision",
    name: "视觉检测",
    tag: "任务 04–05",
    desc: "工件表面质量检测与目标位置展示",
    color: "teal",
  },
  {
    path: "/monitor",
    icon: "monitor",
    name: "设备状态监测",
    tag: "任务 06",
    desc: "监测指标与状态判断方案规划中",
    color: "violet",
  },
  {
    path: "/orders",
    icon: "orders",
    name: "订单预测",
    tag: "任务 07",
    desc: "历史销量分析与未来需求预测",
    color: "amber",
  },
  {
    path: "/energy",
    icon: "energy",
    name: "能源节约",
    tag: "自定义任务",
    desc: "设备用电估算与能耗结构分析",
    color: "green",
  },
];
