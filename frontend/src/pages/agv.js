import { service } from "../services.js";
import { demoRoute, validateMap } from "../core.js";
export default {
  data: () => ({
    map: null,
    agvs: [],
    tasks: [],
    selected: "AGV-01",
    running: false,
    error: "",
    showTask: false,
    from: "source",
    to: "processing",
    tickCount: 0,
  }),
  async mounted() {
    await this.reset();
  },
  beforeUnmount() {
    this.pause();
  },
  computed: {
    active() {
      return this.agvs.find((a) => a.id === this.selected);
    },
    selectedPath() {
      return (
        this.active?.route
          ?.map((p) => (p.x + 0.5) * 32 + "," + (p.y + 0.5) * 32)
          .join(" ") || ""
      );
    },
    moving() {
      return this.agvs.filter((a) => ["取料中", "运输中"].includes(a.status))
        .length;
    },
    parked() {
      return this.agvs.filter((a) => a.status === "待命").length;
    },
    servicing() {
      return this.agvs.filter((a) =>
        ["充电中", "维护中", "前往充电", "前往维护"].includes(a.status),
      ).length;
    },
    finished() {
      return this.tasks.filter((t) => t.status === "已完成").length;
    },
  },
  methods: {
    stationArt(s) {
      return ({source:'307 394 258 44',processing:'620 374 181 56',inspection:'848 374 190 56',review:'1092 374 160 56',home:'355 614 230 46',charging:'690 610 232 52',maintenance:'1020 610 224 52'})[s.id];
    },
    station(id) {
      return this.map?.stations.find((s) => s.id === id)?.name || id;
    },
    async reset() {
      this.pause();
      this.error = "";
      try {
        const data = await service.scenario();
        validateMap(data.map);
        this.map = data.map;
        this.agvs = data.agvs.map((a) => ({
          ...a,
          pos: { ...this.map.stations.find((s) => s.id === "home").dock },
          status: "待命",
          route: [],
          step: 0,
          taskId: null,
        }));
        this.tasks = data.tasks;
        this.selected = this.agvs[0]?.id;
        this.tickCount = 0;
      } catch (e) {
        this.error = e.message;
      }
    },
    pause() {
      clearInterval(this.timer);
      this.timer = null;
      this.running = false;
    },
    start() {
      if (!this.map || this.running) return;
      this.error = "";
      this.running = true;
      this.tick();
      if (this.running) this.timer = setInterval(() => this.tick(), 450);
    },
    addAgv() {
      if (this.agvs.length >= 8) {
        this.error = "演示最多支持 8 台小车。";
        return;
      }
      const id = "AGV-" + String(this.agvs.length + 1).padStart(2, "0");
      this.agvs.push({
        id,
        battery: 100,
        wear: 0,
        pos: { ...this.map.stations.find((s) => s.id === "home").dock },
        status: "待命",
        route: [],
        step: 0,
        taskId: null,
      });
      this.selected = id;
      this.error = "";
    },
    addTask() {
      if (this.from === this.to) {
        this.error = "搬运起点与终点不能相同。";
        return;
      }
      try {
        demoRoute(this.map, this.from, this.to);
        this.tasks.push({
          id: "T-" + String(this.tasks.length + 1).padStart(3, "0"),
          from: this.from,
          to: this.to,
          status: "待分配",
        });
        this.showTask = false;
        this.error = "";
      } catch (e) {
        this.error = e.message;
      }
    },
    async reloadMap() {
      await this.reset();
    },
    dispatch(a) {
      const task = this.tasks.find((t) => t.status === "待分配");
      if (!task) return;
      const pickup = demoRoute(this.map, a.pos, task.from);
      const delivery = demoRoute(this.map, task.from, task.to);
      a.route = [...pickup, ...delivery.slice(1)];
      a.pickupEnd = pickup.length - 1;
      a.step = 0;
      a.taskId = task.id;
      a.status = "取料中";
      task.status = "执行中";
      task.agvId = a.id;
    },
    tick() {
      this.tickCount++;
      try {
        for (const a of this.agvs) {
          if (a.status === "充电中") {
            a.battery = Math.min(100, a.battery + 4);
            if (a.battery === 100) a.status = "待命";
            continue;
          }
          if (a.status === "维护中") {
            a.wait--;
            if (a.wait <= 0) {
              a.wear = 0;
              a.status = "待命";
            }
            continue;
          }
          if (a.status === "待命") {
            if (a.battery < 20 || a.wear >= 80) {
              const target = a.battery < 20 ? "charging" : "maintenance";
              a.route = demoRoute(this.map, a.pos, target);
              a.step = 0;
              a.status = target === "charging" ? "前往充电" : "前往维护";
            } else this.dispatch(a);
          }
          if (a.step < a.route.length - 1) {
            a.step++;
            a.pos = { ...a.route[a.step] };
            a.battery = Math.max(0, a.battery - 0.12);
            a.wear = Math.min(100, a.wear + 0.045);
            if (a.taskId && a.step >= a.pickupEnd) a.status = "运输中";
          }
          if (a.route.length && a.step === a.route.length - 1) {
            if (a.taskId) {
              const task = this.tasks.find((t) => t.id === a.taskId);
              task.status = "已完成";
              a.taskId = null;
              a.status = "待命";
            } else if (a.status === "前往充电") a.status = "充电中";
            else if (a.status === "前往维护") {
              a.status = "维护中";
              a.wait = 16;
            }
            a.route = [];
            a.step = 0;
          }
        }
        if (
          !this.tasks.some((t) => t.status !== "已完成") &&
          this.agvs.every(
            (a) => a.status === "待命" && a.battery >= 20 && a.wear < 80,
          )
        )
          this.pause();
      } catch (e) {
        this.error = e.message;
        this.pause();
      }
    },
    // 同一停靠点的静止车辆仅在绘图时错开，实际网格坐标保持不变。
    vehicleX(a, i) {
      return (
        (a.pos.x + 0.5) * 32 + (a.status === "待命" ? ((i % 3) - 1) * 28 : 0)
      );
    },
    vehicleY(a, i) {
      return (
        (a.pos.y + 0.5) * 32 +
        (a.status === "待命" ? Math.floor(i / 3) * 22 : 0)
      );
    },
  },
  template: /* HTML */ `<div>
    <page-head
      eyebrow="LOGISTICS / 物流管理"
      title="AGV 调度工作台"
      description="查看工厂物流状态，演示任务分配与路径执行。"
      ><span class="pill">固定通道 · 模拟运行</span></page-head
    ><app-notice :message="error" />
    <div v-if="!map&&!error" class="panel loading">正在加载工厂地图…</div>
    <template v-if="map">
      <div class="stat-grid">
        <div class="stat">
          <span>在线车辆</span><strong>{{agvs.length}}<small>台</small></strong>
          <div>本次演示已创建</div>
        </div>
        <div class="stat">
          <span>正在运行</span
          ><strong class="text-primary">{{moving}}<small>台</small></strong>
          <div>{{parked}} 台待命</div>
        </div>
        <div class="stat">
          <span>充电 / 维护</span
          ><strong>{{servicing}}<small>台</small></strong>
          <div>模拟电量与磨损</div>
        </div>
        <div class="stat">
          <span>已完成任务</span
          ><strong>{{finished}}<small>/ {{tasks.length}}</small></strong>
          <div>按创建顺序分配</div>
        </div>
      </div>
      <div class="agv-layout">
        <section class="panel map-panel">
          <div class="panel-title">
            <h3><app-icon name="grid" /> 工厂平面图</h3>
            <div class="btn-row">
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="addAgv"
                :disabled="agvs.length>=8"
              >
                <app-icon name="plus" :size="15" /> 新增小车</button
              ><button
                class="btn btn-sm btn-outline-secondary"
                @click="showTask=true"
              >
                <app-icon name="plus" :size="15" /> 搬运任务</button
              ><button
                class="btn btn-sm btn-primary"
                @click="running?pause():start()"
              >
                <app-icon :name="running?'pause':'play'" :size="14" />
                {{running?'暂停':'开始'}}</button
              ><button class="btn btn-sm btn-outline-secondary" @click="reset">
                <app-icon name="reset" :size="14" /> 重置
              </button>
            </div>
          </div>
          <div class="map-wrap">
            <svg
              class="factory-map"
              :viewBox="'0 0 '+map.cols*32+' '+map.rows*32"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="工厂地图，包含加工、检测、复检与充电工位"
            >
              <defs>
                <pattern
                  id="map-grid"
                  width="32"
                  height="32"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M32 0H0V32"
                    fill="none"
                    stroke="#b4a8c4"
                    stroke-width="1"
                  />
                </pattern>
              </defs>
              <rect :width="map.cols*32" :height="map.rows*32" fill="#d9ccdf" />
              <rect
                :width="map.cols*32"
                :height="map.rows*32"
                fill="url(#map-grid)"
              />
              <g fill="#76678c" font-size="9" font-weight="700" aria-hidden="true">
                <text v-for="n in map.cols" :key="'col'+n" :x="(n-.5)*32" y="15" text-anchor="middle">{{n-1}}</text>
                <text v-for="n in map.rows" :key="'row'+n" x="7" :y="(n-.5)*32+3">{{n-1}}</text>
              </g>
              <path
                :d="'M16 '+(map.corridorY+.5)*32+'H'+(map.cols*32-16)"
                stroke="#746585"
                stroke-width="28"
              />
              <path
                :d="'M16 '+(map.corridorY+.5)*32+'H'+(map.cols*32-16)"
                stroke="#ffc476"
                stroke-width="2"
                stroke-dasharray="9 8"
                fill="none"
              />
              <path :d="'M16 '+(map.corridorY+.5)*32+'H'+(map.cols*32-16)" stroke="#dce2bd" stroke-width="22" stroke-dasharray="1 21" opacity=".45" />
              <g v-for="s in map.stations" :key="s.id">
                <rect
                  :x="s.x*32+2"
                  :y="s.y*32+2"
                  :width="s.w*32-4"
                  :height="s.h*32-4"
                  rx="2"
                  :fill="s.color+'bb'"
                  stroke="#4d4265"
                  stroke-width="2"
                />
                <rect
                  :x="s.x*32+7"
                  :y="s.y*32+7"
                  :width="s.w*32-14"
                  height="7"
                  :fill="s.color"
                  stroke="#4d4265"
                />
                <g :transform="'translate('+(s.x*32+12)+','+(s.y*32+20)+') scale('+(s.h===2?.7:1)+')'" shape-rendering="crispEdges" aria-hidden="true">
                  <template v-if="s.id==='source'">
                    <path fill="#6a4a60" d="M0 20h61v33H0z"/><path fill="#f7bb71" d="M2 15h29v25H2zM34 25h27v22H34z"/><path fill="#ffdc9b" d="M5 18h23v16H5zM37 28h21v15H37z"/><path fill="#b77452" d="M15 17h5v10h-5zM45 27h5v9h-5z"/>
                  </template>
                  <template v-else-if="s.id==='processing'">
                    <path fill="#36465e" d="M1 12h60v39H1z"/><path fill="#8de7e9" d="M5 16h52v28H5z"/><path fill="#1c4c67" d="M10 20h31v20H10z"/><path fill="#c5f5e5" d="M19 25h14v10H19z"/><path fill="#f5bc6c" d="M46 23h6v6h-6z"/><path fill="#a7ed6c" d="M46 33h6v6h-6z"/>
                  </template>
                  <template v-else-if="s.id==='inspection'">
                    <path fill="#2b405b" d="M0 37h62v13H0zM8 2h44v7H8zM25 8h12v17H25z"/><path fill="#75e8ec" d="M15 42h36v3H15zM17 20h28v8H17z"/><path fill="#eeb571" d="M20 29h24v13H20z"/><path fill="#b5f46d" d="M14 28h5v5h-5zM45 28h5v5h-5z"/>
                  </template>
                  <template v-else-if="s.id==='review'">
                    <path fill="#424264" d="M3 15h81v35H3z"/><path fill="#b9e4eb" d="M8 20h39v24H8z"/><path fill="#255369" d="M12 24h31v16H12z"/><path fill="#a9f074" d="M17 30h6v6h-6zM27 27h11v3H27zM27 34h9v3h-9z"/><path fill="#f5b574" d="M53 29h28v19H53z"/><path fill="#ffdb9a" d="M57 32h20v11H57z"/>
                  </template>
                  <template v-else-if="s.id==='home'">
                    <path fill="#3b4c70" d="M2 18h61v19H2z"/><path fill="#61d6eb" d="M6 22h53v10H6z"/><path fill="#f6bd6f" d="M10 11h29v12H10z"/><path fill="#202b49" d="M13 34h12v6H13zM43 34h12v6H43z"/>
                  </template>
                  <template v-else-if="s.id==='charging'">
                    <path fill="#2a4b60" d="M5 10h92v33H5z"/><path fill="#99ef9a" d="M10 15h82v22H10z"/><path fill="#225168" d="M17 20h18v13H17zM45 20h18v13H45zM74 20h11v13H74z"/><path fill="#dfff80" d="M24 20h7l-5 6h5l-7 7 2-6h-5zM52 20h7l-5 6h5l-7 7 2-6h-5z"/>
                  </template>
                  <template v-else>
                    <path fill="#4d455d" d="M5 21h94v25H5z"/><path fill="#e6b9b1" d="M10 24h84v17H10z"/><path fill="#38516c" d="M18 16h35v23H18z"/><path fill="#8adee8" d="M23 20h25v13H23z"/><path fill="#f8c374" d="M61 17h23v22H61z"/>
                  </template>
                </g>
                <svg :x="s.x*32+5" :y="s.y*32+15" :width="s.w*32-10" :height="s.h*32-41" :viewBox="stationArt(s)" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="assets/design-agv.png" width="1672" height="941" /></svg>
                <rect :x="s.x*32+8" :y="(s.y+s.h)*32-27" :width="s.w*32-16" height="20" fill="#303f66" stroke="#87c8ed" stroke-width="1" />
                <text
                  :x="(s.x+s.w/2)*32"
                  :y="(s.y+s.h)*32-12"
                  text-anchor="middle"
                  fill="#f7f2ff"
                  font-size="12"
                  font-weight="800"
                >
                  {{s.short}}
                </text>
                <circle
                  :cx="(s.dock.x+.5)*32"
                  :cy="(s.dock.y+.5)*32"
                  r="4"
                  :fill="s.color"
                />
              </g>
              <g v-for="(b,i) in map.obstacles" :key="i">
                <rect
                  :x="b.x*32+3"
                  :y="b.y*32+3"
                  :width="b.w*32-6"
                  :height="b.h*32-6"
                  rx="2"
                  fill="#a99cbc"
                  stroke="#554a70"
                  stroke-width="2"
                />
                <text
                  :x="(b.x+b.w/2)*32"
                  :y="(b.y+b.h/2)*32"
                  text-anchor="middle"
                  fill="#382e4d"
                  font-size="9"
                >
                  {{b.name}}
                </text>
              </g>
              <polyline
                v-if="selectedPath"
                :points="selectedPath"
                fill="none"
                stroke="#1cdbed"
                stroke-width="5"
                stroke-linejoin="round"
                stroke-dasharray="7 4"
              />
              <g
                v-for="(a,i) in agvs"
                :key="a.id"
                :transform="'translate('+vehicleX(a,i)+','+vehicleY(a,i)+')'"
                @click="selected=a.id"
                @keydown.enter="selected=a.id"
                tabindex="0"
                role="button"
                :aria-label="'选择 '+a.id"
                class="vehicle"
              >
                <circle
                  v-if="selected===a.id"
                  r="17"
                  fill="#58e4ed55"
                  stroke="#17cddd"
                />
                <rect
                  x="-11"
                  y="-8"
                  width="22"
                  height="16"
                  rx="2"
                  :fill="selected===a.id?'#ffbe69':'#72c6d7'"
                  stroke="#352c4f"
                  stroke-width="2"
                />
                <rect x="-7" y="-13" width="13" height="8" fill="#e9aa64" stroke="#6e4a4d" stroke-width="1" />
                <rect x="-8" y="7" width="5" height="4" fill="#29304d"/><rect x="4" y="7" width="5" height="4" fill="#29304d"/>
                <text y="3" text-anchor="middle" font-size="8" fill="#2b2847">
                  {{a.id.slice(-2)}}
                </text>
                <text
                  v-if="selected===a.id"
                  y="-23"
                  text-anchor="middle"
                  font-size="9"
                  fill="#302943"
                  font-weight="600"
                >
                  {{a.id}}
                </text>
              </g>
            </svg>
          </div>
          <div class="map-footer">
            <div class="legend">
              <span><i class="dot blue-dot"></i>选中车辆 / 路径</span
              ><span><i class="dot gray-dot"></i>固定设备</span
              ><span>单位：网格</span>
            </div>
            <span class="running-label"
              >{{running?'模拟运行中':'已暂停'}} · {{tickCount}} 步</span
            >
          </div>
        </section>
        <aside class="panel vehicle-panel">
          <div class="panel-title">
            <h3>车辆详情</h3>
            <span class="muted">{{agvs.length}} 台</span>
          </div>
          <div class="vehicle-tabs">
            <button
              v-for="a in agvs"
              :class="{active:selected===a.id}"
              @click="selected=a.id"
            >
              {{a.id}}
            </button>
          </div>
          <template v-if="active"
            ><div class="vehicle-portrait">
              <pixel-art scene="agv" /><span>{{active.id}}</span
              ><small>{{active.status}}</small>
            </div>
            <div class="meter-label">
              <span>电量</span><b>{{active.battery.toFixed(0)}}%</b>
            </div>
            <div class="meter"><i :style="{width:active.battery+'%'}"></i></div>
            <div class="meter-label">
              <span>磨损程度</span><b>{{active.wear.toFixed(0)}}%</b>
            </div>
            <div class="meter amber-meter">
              <i :style="{width:active.wear+'%'}"></i>
            </div>
            <dl class="detail-list">
              <dt>当前位置</dt>
              <dd>({{active.pos.x}}, {{active.pos.y}})</dd>
              <dt>执行任务</dt>
              <dd>{{active.taskId||'暂无'}}</dd>
              <dt>调度方式</dt>
              <dd>顺序分配演示</dd>
            </dl>
            <p class="small-note">
              低电量与高磨损触发模拟充电或维护。本版未实现多车避碰。
            </p></template
          >
        </aside>
      </div>
      <section class="panel task-panel">
        <div class="panel-title">
          <h3>搬运任务</h3>
          <span class="muted">任务排序 → 车辆分配 → 路线执行</span>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>任务编号</th>
                <th>起点工位</th>
                <th>终点工位</th>
                <th>分配车辆</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in tasks" :key="t.id">
                <td class="mono">{{t.id}}</td>
                <td>{{station(t.from)}}</td>
                <td>{{station(t.to)}}</td>
                <td>{{t.agvId||'—'}}</td>
                <td>
                  <span
                    :class="['status',t.status==='已完成'?'done':t.status==='执行中'?'active':'']"
                    >{{t.status}}</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section> </template
    ><module-guide
      input="地图、工位、车辆和搬运任务。"
      process="按创建顺序分配任务，沿地图中央预设通道移动。"
      output="任务状态、车辆状态与选中车辆路线。"
      answer="任务排序、车辆分配和路径规划是三个不同问题。此版是流程演示，未实现最优调度或多车避碰；后续替换服务与调度执行逻辑。"
    />
    <div v-if="showTask" class="dialog-backdrop" @click.self="showTask=false">
      <section
        class="app-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-title"
      >
        <h2 id="task-title">新增搬运任务</h2>
        <p class="muted">选择工位，坐标由地图配置解析。</p>
        <label class="form-label" for="task-from">起点工位</label
        ><select id="task-from" class="form-select" v-model="from">
          <option v-for="s in map.stations" :value="s.id">
            {{s.name}}
          </option></select
        ><label class="form-label mt-3" for="task-to">终点工位</label
        ><select id="task-to" class="form-select" v-model="to">
          <option v-for="s in map.stations" :value="s.id">{{s.name}}</option>
        </select>
        <p v-if="from===to" class="text-danger small mt-2">
          请选择不同的起点与终点。
        </p>
        <div class="dialog-actions">
          <button class="btn btn-outline-secondary" @click="showTask=false">
            取消</button
          ><button
            class="btn btn-primary"
            @click="addTask"
            :disabled="from===to"
          >
            创建任务
          </button>
        </div>
      </section>
    </div>
  </div>`,
};
