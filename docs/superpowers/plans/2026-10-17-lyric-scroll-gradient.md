# 歌词滚动渐变模式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use inline execution with checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为歌词时间线新增可切换的滚动渐变展示，并让浏览器预览与离线视频导出显示一致。

**Architecture:** 项目字段 `lyricDisplay` 保存 `timeline` 或 `scroll`，旧项目缺少该字段时默认 `timeline`。Canvas 和 Pillow 分别按歌词时间插值得到滚动位置，当前句区居中，文字和底色通过歌词区域上下透明渐变淡出。

**Tech Stack:** 原生 HTML/CSS/JavaScript Canvas、Python Pillow、现有 JSON 草稿与 FFmpeg 导出服务。

---

### Task 1: 增加可保存的展示模式选择

**Files:**
- Modify: `outputs/songcut-studio/index.html`
- Modify: `outputs/songcut-studio/styles.css`
- Modify: `outputs/songcut-studio/app.js`

- [x] 在歌词编辑区加入“时间线”和“滚动渐变”两个按钮，默认“时间线”。
- [x] 将 `lyricDisplay` 加入空项目默认值与项目归一化；仅接受 `timeline` 和 `scroll`，旧 JSON 自动采用 `timeline`。
- [x] 绑定按钮状态、保存到本地草稿，并让导入／导出 JSON 原样保留设置。

### Task 2: 实现 Canvas 滚动渐变

**Files:**
- Modify: `outputs/songcut-studio/app.js`

- [x] 时间线模式沿用当前八行、高亮和分隔线绘制。
- [x] 滚动模式按相邻歌词时间计算连续的浮点歌词索引，在歌词区域中间对齐当前进度；首尾索引夹在第一句和最后一句之间。
- [x] 在歌词区域上下边缘使用透明渐变淡出滚动文字和高亮底色，并裁剪在歌词区域内。
- [x] 播放、暂停、拖动进度和切换模式都通过现有 `drawPreview()` 即时刷新。

### Task 3: 对齐离线导出绘制

**Files:**
- Modify: `outputs/songcut-studio/renderer.py`
- Modify: `outputs/songcut-studio/使用说明.md`

- [x] 以同样的时间插值、行距、中心位置和首尾夹取规则绘制滚动歌词。
- [x] 只对歌词图层应用与 Canvas 相同范围的上下透明渐变；页眉、页脚和播放器信息保持原样。
- [x] 更新说明，写清楚如何切换展示方式及模式会保存在项目中。

### Task 4: 刷新交付包

**Files:**
- Update: `outputs/歌切制作台-直接合成版.zip`

- [x] 将新模式相关的 HTML、CSS、JavaScript、Python 和说明文件重新加入现有压缩包。
- [x] 保持本机制作台页面可直接使用。
