import { service, objectVision } from "../services.js";
import { processExample } from "../example-vision.js";
export default {
  data: () => ({
    tab: "surface",
    samples: [],
    sample: null,
    objectSamples: [],
    objectResult: null,
    objectCalibrated: true,
    objectSampleId: null,
    preview: "",
    width: 200,
    height: 200,
    uploaded: false,
    file: null,
    error: "",
    busy: false,
    threshold: 85,
    minArea: 25,
    processed: null,
    showLabels: false,
    objectSelection: "OBJ-01",
    requestId: 0,
  }),
  async mounted() {
    try {
      this.samples = await service.visionSamples();
      await this.chooseSample(this.samples[0]);
    } catch (e) {
      this.error = e.message;
    }
  },
  beforeUnmount() {
    this.requestId++;
    this.release();
  },
  methods: {
    release() {
      if (this.blobUrl) {
        URL.revokeObjectURL(this.blobUrl);
        this.blobUrl = null;
      }
    },
    async setTab(tab) {
      if (this.tab === tab) return;
      this.tab = tab;
      this.error = "";
      this.uploaded = false;
      this.file = null;
      this.processed = null;
      this.release();
      this.requestId++;
      if (tab === "surface") await this.chooseSample(this.samples[0]);
      else {
        this.objectResult = null;
        try {
          this.objectSamples = await objectVision.samples();
          await this.chooseObjectSample(this.objectSamples[0]);
        } catch (e) {
          this.objectSamples = [{id:"local-preview", name:"本地定位示意图", url:"assets/objects.svg", width:640, height:420}];
          await this.chooseObjectSample(this.objectSamples[0]);
          this.error = "任务 5 后端未连接；当前显示本地定位示意图，识别结果需启动后端后生成。";
        }
      }
    },
    async chooseSample(s) {
      if (!s) return;
      this.requestId++;
      this.release();
      this.sample = s;
      this.preview = s.url;
      this.width = s.width;
      this.height = s.height;
      this.uploaded = false;
      this.file = null;
      this.error = "";
      this.processed = null;
      await this.process();
    },
    async chooseObjectSample(sample) {
      if (!sample) return;
      this.requestId++; this.release();
      this.objectSampleId = sample.id;
      this.preview = sample.url; this.width = sample.width; this.height = sample.height;
      this.file = null; this.uploaded = false; this.objectResult = null; this.error = "";
    },
    async upload(event) {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      this.error = "";
      if (!["image/png", "image/jpeg"].includes(file.type)) {
        this.error = "请选择 PNG 或 JPEG 图片。";
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        this.error = "图片不能超过 10 MB。";
        return;
      }
      const token = ++this.requestId,
        url = URL.createObjectURL(file);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        if (token !== this.requestId) {
          URL.revokeObjectURL(url);
          return;
        }
        if (image.naturalWidth * image.naturalHeight > 25000000)
          throw new Error("图片尺寸过大，请使用不超过 2500 万像素的图片。");
        this.release();
        this.blobUrl = url;
        this.preview = url;
        this.width = image.naturalWidth;
        this.height = image.naturalHeight;
        this.uploaded = true;
        this.file = file;
        this.processed = null;
        this.objectResult = null;
        this.objectSampleId = null;
        this.busy = false;
      } catch (e) {
        URL.revokeObjectURL(url);
        if (token === this.requestId)
          this.error = e.message.startsWith("图片")
            ? e.message
            : "图片无法解码，请检查文件是否损坏。";
      }
    },
    async process() {
      const token = ++this.requestId;
      this.busy = true;
      this.error = "";
      try {
        if (this.tab === "objects") {
          const file = this.uploaded ? this.file : new File([await (await fetch(this.preview)).blob()], "sample.png", {type:"image/png"});
          const result = await objectVision.detect(file, this.objectCalibrated);
          if (token === this.requestId) this.objectResult = result;
          return;
        }
        if (this.uploaded) {
          await service.detectImage(this.file, { threshold: this.threshold, minArea: this.minArea, task: this.tab });
          return;
        }
        if (this.tab === "surface" && this.sample) {
          if (
            !Number.isFinite(Number(this.threshold)) ||
            Number(this.threshold) < 1 ||
            Number(this.threshold) > 255 ||
            !Number.isFinite(Number(this.minArea)) ||
            Number(this.minArea) < 1
          )
            throw new Error("边缘阈值须为 1–255，区域像素阈值须大于 0。");
          const r = await processExample(
            this.sample.url,
            Number(this.threshold),
            Number(this.minArea),
          );
          if (token === this.requestId) this.processed = r;
        }
      } catch (e) {
        if (token === this.requestId) this.error = e.message;
      } finally {
        if (token === this.requestId) this.busy = false;
      }
    },
    async restore() {
      if (this.tab === "surface")
        await this.chooseSample(this.sample || this.samples[0]);
      else {
        await this.chooseObjectSample(this.objectSamples[0]);
      }
    },
    imageError() {
      this.error = "图片加载失败，请检查本地示例文件。";
    },
  },
  template: /* HTML */ `<div>
    <page-head
      eyebrow="VISION / 机器视觉"
      title="视觉检测"
      description="观察工件表面特征，理解图像处理与目标定位。"
      ><span class="pill">教学示例 · 算法逐步接入</span></page-head
    >
    <div class="page-tabs">
      <button :class="{active:tab==='surface'}" @click="setTab('surface')">
        任务 04 · 表面质量检测</button
      ><button :class="{active:tab==='objects'}" @click="setTab('objects')">
        任务 05 · 物体定位
      </button>
    </div>
    <app-notice :message="error" />
    <div class="vision-layout">
      <aside class="panel vision-controls">
        <div class="panel-title"><h3>输入与参数</h3></div>
        <div class="upload-area">
          <app-icon name="upload" :size="28" /><b>上传图片</b
          ><span>PNG / JPEG · 最大 10 MB</span
          ><label class="btn btn-outline-primary btn-sm"
            >选择图片<input
              type="file"
              accept="image/png,image/jpeg"
              @change="upload"
              aria-label="上传工件图片"
          /></label>
        </div>
        <div class="control-section">
          <label class="form-label">内置示例</label>
          <div v-if="tab==='surface'" class="sample-list">
            <button
              v-for="s in samples"
              :class="{active:!uploaded&&sample?.id===s.id}"
              @click="chooseSample(s)"
            >
              <img :src="s.url" alt="" />{{s.name}}
            </button>
          </div>
          <div v-else class="sample-list object-sample-list">
            <button v-for="s in objectSamples" :key="s.id" :class="{active:!uploaded&&objectSampleId===s.id}" @click="chooseObjectSample(s)">{{s.name}}</button>
          </div>
        </div>
        <div v-if="tab==='surface'" class="control-section">
          <label class="form-label" for="edge-threshold"
            >边缘阈值 <span>{{threshold}}</span></label
          ><input
            id="edge-threshold"
            type="range"
            min="1"
            max="255"
            v-model.number="threshold"
            class="form-range"
          /><label class="form-label" for="area-threshold">区域像素阈值</label
          ><input
            id="area-threshold"
            type="number"
            min="1"
            max="40000"
            v-model.number="minArea"
            class="form-control"
          /><small class="muted">按连通边缘像素数筛选，不是物理面积。</small
          ><button
            class="btn btn-primary w-100 mt-3"
            @click="process"
            :disabled="busy||!preview"
          >
            {{busy?'处理中…':uploaded?'尝试检测':'更新样例预览'}}</button
          ><label v-if="!uploaded" class="form-check mt-3"
            ><input
              class="form-check-input"
              type="checkbox"
              v-model="showLabels"
            />
            <span class="form-check-label">叠加人工标注（橙色）</span></label
          >
        </div>
        <label v-if="tab==='objects'" class="form-check mt-3"><input type="checkbox" class="form-check-input" v-model="objectCalibrated" /><span class="form-check-label">按 BlenderProc 相机和 0.5 m 立方体估算 XYZ</span></label>
        <button
          v-if="tab==='objects'"
          class="btn btn-primary w-100 mt-3"
          @click="process"
          :disabled="busy||!preview"
        >
          {{busy?'识别中…':'开始识别'}}
        </button>
        <p class="small-note mt-3">
          {{tab==='objects'?'上传新图会保留坐标选项；只有图片仍符合当前 BlenderProc 相机、尺寸和立方体条件时，XYZ 估算才有物理意义。':'仅对内置样例运行简化处理流程。候选区域不等于已确认缺陷。'}}
        </p>
      </aside>
      <div>
        <div class="panel-title standalone">
          <h3>{{tab==='surface'?'图像处理流程':'目标位置展示'}}</h3>
          <span class="pill neutral"
            >{{uploaded?'已上传图片':tab==='surface'?'真实样例 · 简化处理':objectSampleId==='local-preview'?'本地定位示意图':'BlenderProc 测试集'}}</span
          >
        </div>
        <div v-if="tab==='surface'" class="image-grid">
          <section class="panel image-card">
            <div class="image-title">
              <span>01</span>
              <h3>原始图像</h3>
            </div>
            <div class="image-stage">
              <img
                v-if="preview"
                :src="preview"
                alt="工件原图"
                @error="imageError"
              /><span v-else>加载中…</span>
            </div>
            <div class="image-caption">
              {{width}} × {{height}} px ·
              {{uploaded?'用户上传':'本地表面缺陷样例'}}
            </div>
          </section>
          <section class="panel image-card">
            <div class="image-title">
              <span>02</span>
              <h3>滤波与增强</h3>
            </div>
            <div class="image-stage">
              <img
                v-if="processed&&!uploaded"
                :src="processed.preprocessed"
                alt="均值滤波与对比度增强结果"
              />
              <div v-else class="empty-mini">
                <app-icon name="vision" :size="26" /><span
                  >等待处理接口接入</span
                >
              </div>
            </div>
            <div class="image-caption">3 × 3 均值滤波 · 对比度拉伸</div>
          </section>
          <section class="panel image-card">
            <div class="image-title">
              <span>03</span>
              <h3>边缘提取</h3>
            </div>
            <div class="image-stage">
              <img
                v-if="processed&&!uploaded"
                :src="processed.edgeImage"
                alt="Sobel 边缘结果"
              />
              <div v-else class="empty-mini">
                <app-icon name="vision" :size="26" /><span>尚无边缘结果</span>
              </div>
            </div>
            <div class="image-caption">Sobel 梯度幅值</div>
          </section>
          <section class="panel image-card">
            <div class="image-title">
              <span>04</span>
              <h3>候选区域与标注对照</h3>
            </div>
            <div class="image-stage">
              <svg
                v-if="processed&&!uploaded"
                :viewBox="'0 0 '+width+' '+height"
                role="img"
                aria-label="蓝色候选区域与可选的橙色人工标注"
              >
                <image :href="preview" :width="width" :height="height" />
                <rect
                  v-for="(b,i) in processed.boxes"
                  :key="'p'+i"
                  :x="b.x"
                  :y="b.y"
                  :width="b.width"
                  :height="b.height"
                  fill="none"
                  stroke="#59a5ff"
                  stroke-width="1.3"
                />
                <template v-if="showLabels">
                  <rect
                    v-for="(b,i) in sample.boxes"
                    :key="'l'+i"
                    :x="b.x"
                    :y="b.y"
                    :width="b.width"
                    :height="b.height"
                    fill="none"
                    stroke="#ffae44"
                    stroke-dasharray="4 2"
                    stroke-width="1.5"
                  />
                </template>
              </svg>
              <div v-else class="empty-mini">
                <app-icon name="box" :size="26" /><span>尚无候选区域</span>
              </div>
            </div>
            <div class="image-caption">
              {{processed&&!uploaded?'候选 '+processed.totalRegions+' 个 · 最多显示 8 个':'未进行质量判断'}} · 非六类识别
            </div>
          </section>
        </div>
        <section v-else class="panel object-panel">
          <div class="object-stage">
            <svg
              v-if="preview"
              :viewBox="'0 0 '+width+' '+height"
              role="img"
              aria-label="物体识别结果"
            >
              <image :href="preview" :width="width" :height="height" />
              <template v-if="objectResult">
                <g v-for="o in objectResult.targets" :key="o.objectId" @click="objectSelection=o.objectId" class="object-box">
                  <rect :x="o.bbox.x" :y="o.bbox.y" :width="o.bbox.w" :height="o.bbox.h" fill="transparent" :stroke="objectSelection===o.objectId?'#2864df':'#e05a24'" :stroke-width="objectSelection===o.objectId?3:2" />
                  <text :x="o.bbox.x" :y="Math.max(15,o.bbox.y-8)" fill="#2864df" font-size="18">{{o.objectId}} · {{o.color}}</text>
                </g>
              </template>
            </svg>
          </div>
          <div class="image-caption">
            {{width}} × {{height}} px · 左上角为原点，x 向右、y 向下
          </div>
          <div v-if="!objectResult" class="empty-message">选择图片后点击“开始识别”。</div>
          <div v-else-if="!objectResult.targets.length" class="empty-message">未识别到目标立方体。</div>
          <table v-else class="table object-table">
            <thead><tr><th>目标 / 颜色</th><th>目标框 x, y, w, h</th><th>中心 px / 归一化</th><th>空间 XYZ (m)</th></tr></thead>
            <tbody><tr v-for="o in objectResult.targets" :key="o.objectId" :class="{selected:objectSelection===o.objectId}" @click="objectSelection=o.objectId">
              <td>{{o.objectId}} · {{o.color}}</td>
              <td>{{o.bbox.x}}, {{o.bbox.y}}, {{o.bbox.w}}, {{o.bbox.h}}</td>
              <td>({{o.center.x}}, {{o.center.y}})<br/>({{o.centerNormalized.x}}, {{o.centerNormalized.y}})</td>
              <td>{{o.position?'('+o.position.x+', '+o.position.y+', '+o.position.z+')':'不可用'}}</td>
            </tr></tbody>
          </table>
          <p v-if="objectResult" class="small-note">{{objectResult.note}}</p>
        </section>
        <div class="info-strip mt-3">
          <app-icon name="help" :size="18" /><span
            >{{tab==='surface'?'算法候选框与人工标注框用途不同。没有正常样本验证，不能把“未检出”解释为“合格”。':'像素位置不是实际空间位置。需要相机标定、坐标转换和平面假设，才能计算工件实际坐标。'}}</span
          >
        </div>
      </div>
    </div>
    <module-guide
      input="工件图片；内置表面样例来自本地数据集。"
      process="表面样例演示滤波、增强、Sobel 与连通区域筛选；定位页用 OpenCV HSV 与轮廓提取。"
      output="处理图、候选区域或颜色、目标框、像素中心及条件性 XYZ 估算。"
      answer="表面缺陷检测服务于质量分析，物体定位服务于抓取。两者输入场景与评价方法不同；本版任务 5 不训练神经网络；XYZ 只在已知合成场景条件下估算。"
    />
  </div>`,
};
