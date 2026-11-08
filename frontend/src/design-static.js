const routeImages = {
  "/": "design-home.png",
  "/agv": "design-agv.png",
  "/vision": "design-vision-surface.png",
  "/monitor": "design-monitor.png",
  "/orders": "design-orders.png",
  "/energy": "design-energy.png",
  "/guide": "design-guide.png",
};
const links = [
  ["/", "总览"], ["/agv", "AGV 调度"], ["/vision", "视觉检测"],
  ["/monitor", "设备监测"], ["/orders", "订单预测"],
  ["/energy", "能源节约"], ["/guide", "使用说明"],
];
const navRows = {
  "/": [140, 215, 288, 360, 433, 505, 578],
  "/agv": [128, 204, 277, 347, 415, 482, 548],
  "/vision": [188, 264, 337, 410, 483, 556, 630],
  "/monitor": [96, 174, 251, 329, 406, 483, 561],
  "/orders": [194, 264, 334, 404, 478, 557, 628],
  "/energy": [166, 233, 299, 366, 433, 501, 576],
  "/guide": [177, 251, 326, 400, 474, 548, 622],
};
const homeCards = [
  ["/agv", "进入 AGV 调度", 280],
  ["/vision", "进入视觉检测", 560],
  ["/monitor", "查看设备监测规划", 840],
  ["/orders", "进入订单预测", 1118],
  ["/energy", "进入能源节约", 1398],
];
export const isStaticDesignRoute = (path) => !!routeImages[path];
export default {
  props: ["path", "visionTab"],
  emits: ["activate", "switch-vision", "reset"],
  computed: {
    image() { return "assets/" + (this.path==="/vision" && this.visionTab==="objects" ? "design-vision-objects.png" : routeImages[this.path]); },
    hotspots() {
      const rows = this.path==="/vision" && this.visionTab==="objects" ? [160,235,310,385,459,532,638] : navRows[this.path];
      const nav = links.map(([to, label], i) => ({to, label, x:16, y:rows[i], w:215, h:58}));
      if (this.path === "/") return nav.concat(homeCards.map(([to, label, x]) => ({to,label,x,y:717,w:220,h:51})));
      return nav;
    },
    actions() {
      switch(this.path) {
        case "/agv": return [
          ["新增小车", "new-agv", 896, 80, 175, 58],
          ["新增搬运任务", "new-task", 1090, 80, 192, 58],
          ["开始或暂停运行", "run", 1300, 80, 165, 58],
          ["重置调度", "reset", 1485, 80, 168, 58],
        ];
        case "/vision": return this.visionTab==="objects" ? [
          ["切换表面质量检测", "surface", 258, 187, 302, 50],
          ["开始识别", "detect", 261, 678, 266, 67],
        ] : [
          ["切换物体定位", "objects", 625, 153, 302, 53],
          ["更新样例预览", "process", 285, 700, 296, 56],
        ];
        case "/orders": return [["生成预测", "predict", 1344, 473, 300, 62]];
        case "/energy": return [["计算全部设备能耗", "calculate", 678, 566, 281, 60]];
        default: return [];
      }
    },
    hasData() { return ["/agv","/vision","/orders","/energy"].includes(this.path); },
  },
  methods: {
    spotStyle(s) { return {left: `${s.x/1672*100}%`, top: `${s.y/941*100}%`, width: `${s.w/1672*100}%`, height: `${s.h/941*100}%`}; },
  },
  template: /* HTML */ `<div class="design-static">
    <img class="design-static-image" :src="image" alt="" aria-hidden="true" />
    <h1 class="visually-hidden">{{({'/':'智能工厂总览','/agv':'AGV 调度','/vision':'视觉检测','/monitor':'设备状态监测','/orders':'订单预测','/energy':'能源节约','/guide':'演示与学习指南'})[path]}}</h1>
    <button v-if="hasData" class="design-hotspot design-data-hotspot" type="button" :style="spotStyle({x:244,y:path==='/agv'?143:path==='/vision'?150:path==='/orders'?177:162,w:1410,h:path==='/agv'?788:path==='/vision'?772:path==='/orders'?750:770})" aria-label="打开当前模块的交互数据区" @click="$emit('activate','')"></button>
    <router-link v-for="s in hotspots" :key="s.to+'-'+s.x" class="design-hotspot" :to="s.to" :style="spotStyle(s)" :aria-label="s.label" @click="$emit('reset')"><span class="visually-hidden">{{s.label}}</span></router-link>
    <button v-for="a in actions" :key="a[1]" class="design-hotspot design-action-hotspot" type="button" :style="spotStyle({x:a[2],y:a[3],w:a[4],h:a[5]})" :aria-label="a[0]" @click="a[1]==='surface'||a[1]==='objects'?$emit('switch-vision',a[1]):$emit('activate',a[1])"></button>
  </div>`,
};
