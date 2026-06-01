---
title: "Personal Workbench — 公众号 & 小红书 封面改造设计"
date: "2026-06-01"
status: "draft"
---

# 设计文档：个人工作台 — 公众号 & 小红书封面改造

## 1. 概述

将 html-anything 仓库改造为个人内容工作台。第一期聚焦**微信公众号发布**和**小红书发布**两个场景，核心能力是：
- 用 AI 把文章 Markdown 内容渲染成小红书卡片图片（AI 智能分页，段落完整不中断）
- 用 AI 生成公众号头条封面图
- 所有导出都是 **HTML → PNG**（modern-screenshot），不依赖任何图像生成模型
- 保留现有的模板库预览能力，扩展为"主题库"

## 2. 架构

### 2.1 整体布局

保持现有三栏布局：
```
┌─────────────────────────────────────────────────────────┐
│  TopBar: [品牌] [分类: ✏️文章 📈投资 🏠家庭 💼咨询] [设置]  │
├──────────┬──────────────────────────┬───────────────────┤
│          │                          │                   │
│ 任务列表  │    Markdown 编辑器        │   预览区           │
│ (按分类   │    (复用现有能力)         │   + 模式切换器      │
│  过滤)    │                          │   + 下载按钮        │
│          │                          │                   │
└──────────┴──────────────────────────┴───────────────────┘
```

### 2.2 预览区模式

预览区新增模式切换 pill，位于 iframe 上方：

```
┌──────────────────────────────────────────────────┐
│ 📝 文章    📱 小红书    📰 公众号封面  [🎨 选择主题] │
├──────────────────────────────────────────────────┤
│  ┌──────────────────────────────┐               │
│  │   iframe（动态尺寸）          │               │
│  └──────────────────────────────┘               │
│  [‹ 1/5 ›]    [⬇ 下载全部]  [⬇ 当前页]           │
└──────────────────────────────────────────────────┘
```

三种模式：

| 模式 | iframe 尺寸 | 内容来源 | 分页 |
|------|------------|---------|------|
| 📝 文章预览 | 自适应宽度 | Markdown → HTML（普通排版） | 不分页 |
| 📱 小红书卡片 | 1080px 宽 × 1440px 高 | AI 智能分页 + 主题排版 | AI 按段落语义分 N 页 |
| 📰 公众号封面 | 900px 宽 × 383px 高 | AI 提取标题/摘要生成封面 | 单页 |

## 3. 分类导航

### 3.1 TopBar 分类 pill

- 位置：品牌 Logo 右侧，设置按钮左侧
- 分类：`article`（写文章）、`invest`（投资）、`family`（家庭关系）、`consult`（企业咨询）
- 行为：点击切换 → 左侧 task 列表只过滤该分类的 task
- 新建 task 自动归属当前分类
- 当前分类持久化到 localStorage

### 3.2 Task 结构扩展

```typescript
type Task = {
  // ... 现有字段全部不变
  category: 'article' | 'invest' | 'family' | 'consult'; // 新增
};
```

## 4. 小红书卡片模式

### 4.1 渲染流程

1. 用户写完 Markdown → 点击 📱 小红书
2. AI 接收指令：
   - 输入：当前 Markdown 内容 + 当前选中的主题 ID
   - 指令：将内容分成 N 张 1080×1440 的卡片，**按段落智能切分**（不在段落中间切断），每页有起承转合
   - 输出：完整 HTML（包含所有页，每页一个 `<section class="card-page" data-page="N">`）
3. HTML 注入 iframe，分页切换通过 JS 控制：每个 `<section class="card-page">` 用 `display:none` 隐藏，当前页 `display:block`。底部控制栏用 `←` `→` 按钮切换 `data-page` 索引
4. 用户点 `←` `→` 切换页，底部显示 `1 / N`

### 4.2 主题库

- 点击 `[🎨 选择主题]` 复用现有 TemplatePicker 组件，但增加 mode 过滤：只显示 `mode: 'xhs'` 或 `mode: 'wechat-cover'` 的 skill
- 每个主题有：缩略图预览、名称、描述、`example.html`
- 点击主题 → 即时应用，AI 用新主题风格重新渲染同一内容
- 后续新增主题只需加一个 skill 文件夹（和现有协议一致）

### 4.3 初始主题

| 主题 ID | 名称 | 风格描述 |
|---------|------|---------|
| `xhs-big-poster` | 大字报 | 标题超大，留白多，重点句高亮 |
| `xhs-magazine` | 杂志卡片 | 精致段落，均匀间距，知识感 |
| `xhs-minimal` | 极简白底 | 干净纯白，大段文字直展示 |

### 4.4 下载

- `[⬇ 下载全部]`：逐页 modern-screenshot → JSZip 打包下载
- `[⬇ 当前页]`：modern-screenshot 当前页 → 单张 PNG

## 5. 公众号封面模式

### 5.1 渲染流程

1. 用户点击 📰 公众号封面
2. AI 接收指令：
   - 输入：当前 Markdown 内容
   - 指令：生成 900×383 的封面 HTML，包含标题+摘要+背景，重要内容居中（分享 1:1 裁切安全区）
   - 输出：单个 HTML
3. 预览区渲染 900×383 尺寸
4. 主题库同样可用

### 5.2 初始封面主题

| 主题 ID | 名称 |
|---------|------|
| `wc-magazine` | 杂志风 |
| `wc-bold-title` | 大字标题 |
| `wc-gradient` | 渐变背景 |

### 5.3 下载

- `[⬇ 下载封面 PNG]`：modern-screenshot → 单张 PNG

## 6. 文章预览模式

- 复用现有 iframe 预览能力，不做改动
- 导出：`[复制 HTML]`（juice 内联 CSS，粘贴到公众号编辑器）

## 7. Store 变更

### 7.1 Task 新增字段

```typescript
category: 'article' | 'invest' | 'family' | 'consult';
```

### 7.2 State 新增字段

```typescript
type State = {
  activeCategory: Category;
  setActiveCategory: (c: Category) => void;
  // ... 其余不变
};
```

## 8. 导出增强

| 模式 | 导出能力 |
|------|---------|
| 📝 文章 | 复制 HTML（juice 内联 CSS） |
| 📱 小红书 | 下载全部 N 张 PNG / 下载当前页 |
| 📰 公众号 | 下载封面 PNG |

## 9. 改动文件清单

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `next/src/lib/store.ts` | 修改 | Task 加 `category`，State 加 `activeCategory` |
| `next/src/components/toolbar.tsx` | 修改 | TopBar 加分类 pill |
| `next/src/components/tasks-sidebar.tsx` | 修改 | 按分类过滤 task |
| `next/src/components/preview-pane.tsx` | 修改 | 新增模式切换器 + 动态 iframe 尺寸 + 分页控制 + 下载按钮 |
| `next/src/components/preview-mode-switcher.tsx` | 新增 | 预览区顶部的模式切换 pill 组件 |
| `next/src/lib/card-splitter.ts` | 新增 | AI 智能分页逻辑：把 Markdown 按段落智能拆成多页 HTML 的 prompt 构建 |
| `next/src/lib/templates/skills/xhs-big-poster/` | 新增 | 大字报主题 skill |
| `next/src/lib/templates/skills/xhs-magazine/` | 新增 | 杂志卡片主题 skill |
| `next/src/lib/templates/skills/xhs-minimal/` | 新增 | 极简白底主题 skill |
| `next/src/lib/templates/skills/wc-magazine/` | 新增 | 公众号封面-杂志风 skill |
| `next/src/lib/templates/skills/wc-bold-title/` | 新增 | 公众号封面-大字标题 skill |
| `next/src/lib/templates/skills/wc-gradient/` | 新增 | 公众号封面-渐变背景 skill |
| `CLAUDE.md` | 修改 | 改写为个人工作台定位 |
| `AGENTS.md` | 修改 | 改写为个人工作台定位 |
| `README.md` | 修改 | 改写为个人工作台定位 |

## 11. 保留现有能力（重要约束）

本次改造是**增量增强**，不是重写。以下现有能力**全部保留，不做破坏性改动**：

### 11.1 Agent 后端

- 8 个 CLI 的自动检测、stream-json 适配、SSE 流式渲染全部保留
- `/api/agents` 和 `/api/convert` 路由不变
- 所有 75+ 现有 skill 保持不变

### 11.2 现有模板系统

- TemplatePicker 组件保留
- 75 个 skill 的 `SKILL.md` 协议不变
- 新增 xhs/wechat skill 是**增量添加**，不是替换

### 11.3 哪些东西不变

| 能力 | 状态 |
|------|------|
| Agent 检测 + SSE 流 | ✅ 不变 |
| 75+ skill 模板库 | ✅ 不变 |
| Markdown/CSV/JSON 输入 | ✅ 不变 |
| juice 内联 CSS 导出 | ✅ 不变 |
| modern-screenshot PNG 导出 | ✅ 不变 |
| 三栏布局框架 | ✅ 保留骨架，顶部加分类导航 |

### 11.4 只改什么

1. **TopBar** → 加分类 pill，让页面更像个人工作台而非通用 HTML 编辑器
2. **Task 结构** → 加 `category` 字段，让 task 列表能按分类过滤
3. **PreviewPane** → 加模式切换器，让小红书/公众号的预览更定制化
4. **新增 6 个 skill** → 3 个小红书卡片 + 3 个公众号封面主题

## 10. 技术决策

### 10.1 为什么用 AI 分页而不是前端 JS 切分

- AI 能理解文章结构，按段落语义智能切分（不在段落中间切断）
- 每页可以有自己的起承转合，而不是"刚好塞满 1440px"
- AI 输出的 HTML 天然适配主题 CSS

### 10.2 为什么不用图像模型

- 纯 HTML → modern-screenshot → PNG 的链路已经成熟
- 成本低，速度快，可控性强
- HTML 本身可以被编辑和迭代

### 10.3 为什么保留主题库

- 现有 TemplatePicker 是仓库的核心能力之一
- 预览即选择，所见即所得
- 新增主题只需加一个 skill 文件夹

### 10.4 AI 分页 prompt 格式

AI 收到的系统指令模板：

```
你是一个小红书内容排版专家。请将以下 Markdown 内容分成 N 张 1080×1440 的卡片。
规则：
1. 按段落智能切分，不在段落中间切断
2. 每页有起承转合（开头有引入，结尾有收束）
3. 使用 [主题名称] 风格的 CSS 类名
4. 输出完整 HTML，每页用 <section class="card-page" data-page="N"> 包裹
5. 所有 CSS 内联
```

AI 输出一个完整 HTML 字符串，包含所有页面的 `<section>`。前端用 JS 控制显示/隐藏。
