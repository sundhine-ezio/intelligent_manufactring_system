import { service } from "../services.js";
export default {
  data: () => ({
    rows: [],
    result: null,
    tab: "全部",
    error: "",
    busy: false,
    requestId: 0,
  }),
  async mounted() {
    await this.reset();
  },
  beforeUnmount() {
    this.requestId++;
  },
  computed: {
    filtered() {
      return this.tab === "全部"
        ? this.rows
        : this.rows.filter((r) => r.group === this.tab);
    },
    deviceTotal() {
      return (
        this.result?.items
          .filter((r) => r.group === "设备")
          .reduce((s, r) => s + r.kwh, 0) || 0
      );
    },
    agvTotal() {
      return (
        this.result?.items
          .filter((r) => r.group === "AGV")
          .reduce((s, r) => s + r.kwh, 0) || 0
      );
    },
    chartOption() {
      return {
        animation: false,
        aria: {
          enabled: true,
          label: { description: "设备区与 AGV 区的单日预计用电占比" },
        },
        color: ["#c8f25d", "#53e1e9"],
        tooltip: { trigger: "item", formatter: "{b}<br/>{c} kWh（{d}%）" },
        legend: {
          bottom: 0,
          textStyle: { color: "#ece5f6" },
          itemWidth: 9,
          itemHeight: 9,
        },
        graphic: this.result?.total > 0 ? [{
          type: "text", left: "center", top: "38%",
          style: {text: this.result.total.toFixed(1)+"\nkWh/日", fill: "#fff8e6", font: "bold 19px sans-serif", textAlign: "center", lineHeight: 24},
        }] : [],
        series: [
          {
            type: "pie",
            radius: ["46%", "66%"],
            center: ["50%", "43%"],
            avoidLabelOverlap: true,
            itemStyle: { borderColor: "#302b52", borderWidth: 3, borderRadius: 2 },
            label: { show: false },
            data: [
              {name:"设备用电",value:+this.deviceTotal.toFixed(4)},
              {name:"AGV 用电",value:+this.agvTotal.toFixed(4)},
            ].filter((r) => r.value > 0),
          },
        ],
      };
    },
  },
  methods: {
    edited() {
      this.result = null;
      this.error = "";
      this.requestId++;
      this.busy = false;
    },
    async reset() {
      try {
        this.rows = await service.energyDefaults();
        this.result = null;
        this.error = "";
        await this.calculate();
      } catch (e) {
        this.error = e.message;
      }
    },
    async calculate() {
      const token = ++this.requestId;
      this.busy = true;
      this.error = "";
      try {
        const r = await service.energy(this.rows);
        if (token === this.requestId) this.result = r;
      } catch (e) {
        if (token === this.requestId) {
          this.result = null;
          this.error = e.message;
        }
      } finally {
        if (token === this.requestId) this.busy = false;
      }
    },
    kwh(row) {
      return this.result?.items.find((r) => r.id === row.id)?.kwh;
    },
  },
  template: /* HTML */ `<div>
    <page-head
      eyebrow="ENERGY / 能源管理"
      title="能源节约"
      description="以简单、可核对的计算，观察设备运行带来的能源消耗。"
      ><span class="pill">自定义任务 · 参数估算</span></page-head
    ><app-notice :message="error" />
    <div class="stat-grid energy-stats">
      <div class="stat">
        <span>预计单日用电</span
        ><strong
          >{{result?result.total.toFixed(2):'—'}}<small>kWh</small></strong
        >
        <div>{{result?'全部设备与 AGV 合计':'参数已修改，请重新计算'}}</div>
      </div>
      <div class="stat">
        <span>设备用电</span
        ><strong
          >{{result?deviceTotal.toFixed(2):'—'}}<small>kWh</small></strong
        >
        <div>加工与检测工位</div>
      </div>
      <div class="stat">
        <span>AGV 用电</span
        ><strong>{{result?agvTotal.toFixed(2):'—'}}<small>kWh</small></strong>
        <div>独立设定 · 未读取调度运行记录</div>
      </div>
    </div>
    <div class="energy-layout">
      <section class="panel energy-inputs">
        <div class="panel-title">
          <h3>设备运行参数</h3>
          <button class="text-button" @click="reset">恢复示例参数</button>
        </div>
        <div class="small-tabs">
          <button
            v-for="t in ['全部','设备','AGV']"
            :class="{active:tab===t}"
            @click="tab=t"
          >
            {{t==='设备'?'设备区':t==='AGV'?'AGV 区':t}}
          </button>
        </div>
        <div class="table-responsive">
          <table class="table energy-table">
            <thead>
              <tr>
                <th>设备名称</th>
                <th>功率 (kW)</th>
                <th>时长 (h/日)</th>
                <th>能耗 (kWh)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in filtered" :key="r.id">
                <td>
                  <span class="device-icon"
                    ><app-icon
                      :name="r.group==='AGV'?'agv':'box'"
                      :size="17" /></span
                  >{{r.name}}
                </td>
                <td>
                  <input
                    :aria-label="r.name+'功率'"
                    class="form-control"
                    type="number"
                    step="0.1"
                    min="0"
                    v-model="r.power"
                    @input="edited"
                  />
                </td>
                <td>
                  <input
                    :aria-label="r.name+'时长'"
                    class="form-control"
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    v-model="r.hours"
                    @input="edited"
                  />
                </td>
                <td class="mono">
                  {{kwh(r)!==undefined?kwh(r).toFixed(2):'—'}}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="energy-actions">
          <span class="muted">能耗 = 功率 × 运行时间</span
          ><button
            class="btn btn-primary"
            @click="calculate"
            :disabled="busy||!rows.length"
          >
            {{busy?'计算中…':'计算全部设备能耗'}}
          </button>
        </div>
      </section>
      <aside class="panel energy-chart">
        <div class="panel-title">
          <h3>用电结构</h3>
          <span class="muted">全部设备</span>
        </div>
        <app-chart
          v-if="result&&result.total>0"
          :option="chartOption"
          height="315px"
        />
        <div v-else class="empty-message">
          {{result?'当前预计能耗为 0，无占比可展示。':'重新计算后显示能耗占比。'}}
        </div>
      </aside>
    </div>
    <div class="energy-bottom">
      <section class="panel">
        <div class="panel-title">
          <h3>节能分析</h3>
          <app-icon name="energy" :size="18" />
        </div>
        <p v-if="result&&result.total>0">
          加工与检测设备占预计用电的
          <b>{{(deviceTotal/result.total*100).toFixed(1)}}%</b
          >。可优先检查高耗能设备的空转时间，再比较调整前后的估算结果。
        </p>
        <p v-else class="muted">计算后查看能耗构成。零用电时不生成占比建议。</p>
        <p class="small-note">
          此处为功率恒定假设下的估算，不包含负载变化、充电损耗或电价，不代表实际节电收益。
        </p>
      </section>
      <section class="panel">
        <div class="panel-title">
          <h3>能源政策资料</h3>
          <span class="pill neutral">待整理</span>
        </div>
        <p class="muted">
          后续手动收集国家与地方政策，保留发布日期和来源链接。
        </p>
        <div class="policy-row"><app-icon name="file" :size="17" /><span>国家节能降碳资料</span><b>待整理</b></div>
        <div class="policy-row"><app-icon name="file" :size="17" /><span>智能制造能效资料</span><b>待整理</b></div>
        <div class="policy-row"><app-icon name="file" :size="17" /><span>工厂能源管理案例</span><b>待整理</b></div>
        <p class="small-note">当前未收录政策条目。</p>
      </section>
    </div>
    <module-guide
      input="人为设定的设备功率和单日运行时间。"
      process="逐台计算 kWh = kW × h，再汇总设备与 AGV 分区。"
      output="单台能耗、分区合计及用电占比。"
      answer="这是简化机理模型。后续订单关联能耗还需要每件加工时长、设备利用率等参数，不能从销量直接推导实际电量。"
    />
  </div>`,
};
