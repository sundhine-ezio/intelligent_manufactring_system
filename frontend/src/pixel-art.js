// Only illustration regions are used. Controls, labels and data remain Vue DOM.
const scenes = {
  agv: ['home', 302, 594, 222, 119],
  vision: ['home', 582, 591, 216, 122],
  monitor: ['home', 858, 597, 222, 116],
  orders: ['home', 1140, 597, 218, 116],
  energy: ['home', 1419, 597, 222, 116],
  sidebar: ['agv', 0, 660, 237, 281],
  canopy: ['energy', 240, 0, 405, 79],
  'monitor-hero': ['monitor', 247, 164, 1392, 280],
  conveyor: ['guide', 228, 758, 1444, 183],
  factory: ['home', 285, 86, 1365, 420],
};
let artId = 0;
export default {
  props: ['scene'],
  data: () => ({clipId: 'art-clip-'+(++artId)}),
  computed: { art() { return scenes[this.scene] || scenes.factory; } },
  template: `<svg class="pixel-art" :viewBox="art.slice(1).join(' ')" :preserveAspectRatio="scene==='canopy'?'xMidYMid slice':'xMidYMid meet'" aria-hidden="true" focusable="false"><defs><clipPath :id="clipId"><rect :x="art[1]" :y="art[2]" :width="art[3]" :height="art[4]" /></clipPath></defs><g :clip-path="'url(#'+clipId+')'"><image :href="'assets/design-'+art[0]+'.png'" width="1672" height="941" /></g></svg>`,
};
