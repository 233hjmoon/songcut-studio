# 雨后便利店主题 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use inline execution with checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增加“雨后便利店”主题切换，让编辑器、画布预览和直接合成 MP4 共用所选主题。

**Architecture:** 项目 JSON 增加 `theme` 字段，`paper` 为兼容旧项目的默认值，`rainy-night` 为新增主题。浏览器以 `body[data-theme]` 驱动页面外观、以 JS 主题令牌绘制 Canvas；Python 渲染器以同名主题字典绘制导出帧。

**Tech Stack:** HTML、CSS、原生 JavaScript Canvas、Python Pillow、现有本机 FFmpeg 服务。

---

### Task 1: 主题选择和项目状态

**Files:** `index.html`, `app.js`

- [x] 在顶部加入“暖纸唱片 / 雨后便利店”按钮组。
- [x] 将 `theme` 纳入空项目、JSON 归一化、草稿保存、JSON 导入，并在主题改变或项目导入后同步 body 属性与按钮状态。

### Task 2: 制作台全局主题

**Files:** `styles.css`

- [x] 使用 `body[data-theme="rainy-night"]` 覆盖顶栏、页面底色、预览边框、传输条、编辑器、输入框、上传区、歌词切换与按钮色。
- [x] 建立深海军蓝底、雾蓝面板、青白强调和少量紫蓝反光的层级，确保文字、focus 与 disabled 状态仍清晰。

### Task 3: Canvas 和离线视频帧统一调色

**Files:** `app.js`, `renderer.py`

- [x] 建立 `paper` 和 `rainy-night` 主题令牌，替换 Canvas 中写死的布局底色、线条、文本、歌词与播放器颜色。
- [x] 在 Pillow `FrameRenderer` 中实现同名调色板，并按项目 `theme` 绘制背景、面板、歌词和信息文字。
- [x] 检查主题在时间线和滚动渐变两种歌词模式下都通过同一调色板显示；视频导出已有完整项目 JSON，因此沿用该字段。

### Task 4: 文档和交付

**Files:** `使用说明.md`, `../歌切制作台-直接合成版.zip`

- [x] 说明主题切换、旧项目默认值与导出行为。
- [x] 更新离线版 ZIP，并在现有本机页面切换主题查看视觉结果。
