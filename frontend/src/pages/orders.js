import { service } from "../services.js";
import { aggregateSales } from "../core.js";
export default {
  data: () => ({
    dataset: null,
    store: 1,
    item: 1,
    start: "2017-07-01",
    end: "2017-12-31",
    grain: "week",
    method: "weekly",
    horizon: 30,
    forecast: null,
    busy: false,
    error: "",
    requestId: 0,
  }),
  async mounted() {
    try {
      this.dataset = await service.sales();
    } catch (e) {
      this.error = e.message;
    }
  },
  beforeUnmount() {
    this.requestId++;
  },
  computed: {
    selection() {
      return [
        this.store,
        this.item,
        this.start,
        this.end,
        this.method,
        this.horizon,
      ].join("|");
    },
    history() {
      if (!this.dataset) return [];
      const values = this.dataset.series[this.store + ":" + this.item];
      if (!values) return [];
      return this.dataset.dates
        .map((date, i) => ({ date, sales: values[i] }))
        .filter((r) => r.date >= this.start && r.date <= this.end);
    },
    validation() {
      if (!this.start || !this.end) return "请选择完整的日期范围。";
      if (this.start > this.end) return "开始日期不能晚于结束日期。";
      if (this.dataset && !this.history.length)
        return "所选日期范围没有历史数据，请选择 2013–2017 年的日期。";
      return "";
    },
    total() {
      return this.history.reduce((s, r) => s + r.sales, 0);
    },
    forecastTotal() {
      return this.forecast?.points.reduce((s, r) => s + r.sales, 0) || 0;
    },
    chartOption() {
      const historical = aggregateSales(this.history, this.grain),
        future = aggregateSales(this.forecast?.points || [], this.grain),
        hm = new Map(historical.map((r) => [r.date, r.sales])),
        fm = new Map(future.map((r) => [r.date, r.sales]));
      const dates = [...new Set([...hm.keys(), ...fm.keys()])].sort();
      return {
        animation: false,
        aria: {
          enabled: true,
          label: { description: "所选商店和商品的真实历史销量与演示预测曲线" },
        },
        color: ["#58e4ed", "#ffbc68"],
        tooltip: { trigger: "axis" },
        legend: {
          bottom: 2,
          icon: "roundRect",
          itemWidth: 15,
          itemHeight: 4,
          textStyle: { color: "#ece5f6" },
        },
        grid: { left: 58, right: 24, top: 35, bottom: 62 },
        xAxis: {
          type: "category",
          data: dates,
          boundaryGap: false,
          axisLabel: { color: "#d5cae6", hideOverlap: true },
          axisLine: { lineStyle: { color: "#786e9b" } },
          axisTick: { show: false },
        },
        yAxis: {
          type: "value",
          name: "销量（件）",
          nameTextStyle: { color: "#d5cae6" },
          axisLabel: { color: "#d5cae6" },
          splitLine: { lineStyle: { color: "#665d85" } },
        },
        series: [
          {
            name: "真实历史销量",
            type: "line",
            data: dates.map((d) => hm.get(d) ?? null),
            showSymbol: false,
            lineStyle: { width: 2 },
            areaStyle: { color: "#58e4ed20" },
          },
          {
            name: "演示预测",
            type: "line",
            data: dates.map((d) => fm.get(d) ?? null),
            showSymbol: future.length < 8,
            lineStyle: { width: 2, type: "dashed" },
          },
        ],
      };
    },
  },
  watch: {
    selection() {
      this.forecast = null;
      this.error = "";
      this.requestId++;
      this.busy = false;
    },
  },
  methods: {
    async predict() {
      this.error = "";
      if (this.validation) {
        this.error = this.validation;
        return;
      }
      const token = ++this.requestId;
      this.busy = true;
      try {
        const result = await service.forecast({
          history: this.history,
          method: this.method,
          horizon: Number(this.horizon),
          store: Number(this.store),
          item: Number(this.item),
        });
        if (token === this.requestId) this.forecast = result;
      } catch (e) {
        if (token === this.requestId) this.error = e.message;
      } finally {
        if (token === this.requestId) this.busy = false;
      }
    },
    restore() {
      this.store = 1;
      this.item = 1;
      this.start = "2017-07-01";
      this.end = "2017-12-31";
      this.grain = "week";
      this.method = "weekly";
      this.horizon = 30;
      this.forecast = null;
    },
  },
  template: /* HTML */ `<div>
    <page-head
      eyebrow="DEMAND / 需求分析"
      title="订单预测"
      description="从历史销量观察需求变化，为预测与计划提供依据。"
      ><span class="pill">真实历史 · 演示预测</span></page-head
    ><app-notice :message="error||validation" />
    <section class="panel filter-panel">
      <div class="filter-grid">
        <div>
          <label class="form-label" for="store">商店</label
          ><select id="store" v-model.number="store" class="form-select">
            <option v-for="s in dataset?.stores||[1]" :value="s">
              商店 {{s}}
            </option>
          </select>
        </div>
        <div>
          <label class="form-label" for="item">商品</label
          ><select id="item" v-model.number="item" class="form-select">
            <option v-for="i in dataset?.items||[1]" :value="i">
              商品 {{i}}
            </option>
          </select>
        </div>
        <div>
          <label class="form-label" for="date-start">开始日期</label
          ><input
            id="date-start"
            v-model="start"
            type="date"
            class="form-control"
            min="2013-01-01"
            max="2017-12-31"
          />
        </div>
        <div>
          <label class="form-label" for="date-end">结束日期</label
          ><input
            id="date-end"
            v-model="end"
            type="date"
            class="form-control"
            min="2013-01-01"
            max="2017-12-31"
          />
        </div>
        <div>
          <label class="form-label" for="grain">展示粒度</label
          ><select id="grain" v-model="grain" class="form-select">
            <option value="day">按日</option>
            <option value="week">按周</option>
            <option value="month">按月</option>
          </select>
        </div>
        <button class="btn btn-outline-secondary align-end" @click="restore">
          重置筛选
        </button>
      </div>
      <p class="filter-caption">
        本地演示子集：商店 1–2、商品 1–3。共 6 条真实日销量序列，数据范围
        2013–2017 年。
      </p>
    </section>
    <div class="stat-grid orders-stats">
      <div class="stat">
        <span>所选历史总销量</span
        ><strong>{{total.toLocaleString()}}<small>件</small></strong>
        <div>{{history.length}} 个观测日</div>
      </div>
      <div class="stat">
        <span>平均每日销量</span
        ><strong
          >{{history.length?(total/history.length).toFixed(1):'—'}}<small
            >件 / 日</small
          ></strong
        >
        <div>总销量 ÷ 观测天数</div>
      </div>
      <div class="stat">
        <span>预测期销量</span
        ><strong
          >{{forecast?forecastTotal.toLocaleString():'—'}}<small
            >件</small
          ></strong
        >
        <div>{{forecast?'未来 '+horizon+' 天 · 演示值':'尚未生成示例'}}</div>
      </div>
      <div class="stat">
        <span>预测误差</span
        ><strong class="text-muted metric-text">尚未评价</strong>
        <div>待接入历史回测</div>
      </div>
    </div>
    <div class="orders-layout">
      <section class="panel">
        <div class="panel-title">
          <h3>历史销量与预测趋势</h3>
          <span class="muted">商店 {{store}} / 商品 {{item}}</span>
        </div>
        <app-chart v-if="history.length" :option="chartOption" height="350px" />
        <div v-else class="empty-message">
          {{dataset?'该筛选条件下暂无数据':'正在读取本地历史数据…'}}
        </div>
        <div class="chart-footnote">
          周数据按周一归组，周 /
          月边界可能是不完整区间。预测从所选历史结束日的下一天开始。
        </div>
      </section>
      <div class="orders-side"><aside class="panel forecast-panel">
        <div class="panel-title">
          <h3>预测设置</h3>
          <app-icon name="orders" :size="18" />
        </div>
        <label for="forecast-method" class="form-label">示例方法</label
        ><select id="forecast-method" class="form-select" v-model="method">
          <option value="weekly">重复最近 7 天</option>
          <option value="mean">最近 28 天均值</option></select
        ><label for="forecast-horizon" class="form-label mt-3">预测天数</label
        ><select
          id="forecast-horizon"
          class="form-select"
          v-model.number="horizon"
        >
          <option :value="7">7 天</option>
          <option :value="30">30 天</option>
          <option :value="90">90 天</option></select
        ><button
          class="btn btn-primary w-100 mt-4"
          @click="predict"
          :disabled="busy||!dataset||!!validation"
        >
          {{busy?'生成中…':'生成示例预测'}} <app-icon name="arrow" :size="16" />
        </button>
        <div class="prediction-note">
          <b>{{forecast?'示例已生成':'预测说明'}}</b>
          <p>
            {{forecast?forecast.note:'使用简单规则展示预测交互，尚未完成模型训练、参数选择和误差检验。'}}
          </p>
        </div>
      </aside>
      <section class="panel purchase-panel">
        <div class="panel-title"><h3><app-icon name="box" :size="19" />采购建议</h3><span class="pill neutral">待接入库存</span></div>
        <div class="purchase-row"><span>预测期需求</span><b>{{forecast?forecastTotal.toLocaleString()+' 件':'—'}}</b></div>
        <div class="purchase-row"><span>当前库存</span><b>未提供</b></div>
        <div class="purchase-row purchase-result"><span>建议采购量</span><b>待计算</b></div>
        <p class="small-note">采购量需要当前库存、在途量和安全库存。现有数据只有销量，不能给出可靠数量。</p>
      </section></div>
    </div>
    <div class="info-strip mt-3">
      <app-icon name="help" :size="18" /><span
        >数据中的 sales
        表示销量，不是销售额或订单笔数。排产与补货建议还需要库存、产能等额外参数。</span
      >
    </div>
    <module-guide
      input="按商店、商品和日期筛选的真实历史销量。"
      process="前端按日、周或月汇总；两种简单规则仅用于预测流程演示。"
      output="历史曲线、示例预测曲线和预测期合计。"
      answer="应按时间划分训练与测试区间，比较多种方法并计算 MAE、RMSE 等指标。没有真实回测结果时不显示虚构准确率。"
    />
  </div>`,
};
