import test from 'node:test';
import assert from 'node:assert/strict';
import vision from '../src/pages/vision.js';

test('任务 5 上传新图保留坐标参数选项', async () => {
  const originalImage = globalThis.Image;
  globalThis.Image = class {
    naturalWidth = 1280;
    naturalHeight = 960;
    async decode() {}
  };
  const state = vision.data();
  state.release = vision.methods.release.bind(state);
  const file = new Blob(['valid image placeholder'], { type: 'image/png' });
  try {
    for (const selected of [true, false]) {
      state.objectCalibrated = selected;
      const event = { target: { files: [file], value: 'rgb.png' } };
      await vision.methods.upload.call(state, event);
      assert.equal(state.objectCalibrated, selected);
      assert.equal(state.uploaded, true);
      assert.equal(state.file, file);
      await vision.methods.chooseObjectSample.call(state, { id: '000008', url: 'sample.png', width: 1280, height: 960 });
      assert.equal(state.objectCalibrated, selected);
    }
  } finally {
    state.release();
    globalThis.Image = originalImage;
  }
});
