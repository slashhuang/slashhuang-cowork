# Personal Workbench 改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 html-anything 改造为个人内容工作台 — 分类导航 + 预览区模式切换 + AI 封面/卡片生成

**Architecture:** 增量改造，保留所有现有 agent 后端、75+ skill、三栏布局骨架。新增分类 pill 导航（TopBar）、预览区模式切换器（PreviewPane 顶部）、以及 6 个新 skill（3 小红书 + 3 公众号封面）。

**Tech Stack:** Next.js 16, React 19, zustand, Tailwind v4, modern-screenshot

---

### Task 1: Store 扩展 — 分类字段

**Files:**
- Modify: `next/src/lib/store.ts`

- [ ] **Step 1: 在 store.ts 中新增 Category 类型和字段**

在 `store.ts` 的 `LayoutMode` 定义之后、`Persisted` 之前，新增：

```typescript
/**
 * Workspace categories. Each task belongs to one category; the sidebar
 * filters by the active category so the user sees only relevant tasks.
 */
export type Category = 'article' | 'invest' | 'family' | 'consult';

export const CATEGORIES: Category[] = ['article', 'invest', 'family', 'consult'];

export const CATEGORY_LABEL: Record<Category, { emoji: string; zh: string; en: string }> = {
  article: { emoji: '✏️', zh: '写文章', en: 'Writing' },
  invest:  { emoji: '📈', zh: '投资',    en: 'Investing' },
  family:  { emoji: '🏠', zh: '家庭关系', en: 'Family' },
  consult: { emoji: '💼', zh: '企业咨询', en: 'Consulting' },
};
```

在 `Task` type 中新增 `category: Category` 字段（放在 `deployments` 之后、`createdAt` 之前）：

```typescript
type Task = {
  // ... 现有字段（id, name, content, format, html, status, log, stats, deployments 等）
  category: Category;  // 新增
  // createdAt, updatedAt 保持不变
};
```

在 `Persisted` type 中新增 `activeCategory: Category`：

```typescript
type Persisted = {
  // ... 现有字段
  activeCategory: Category;  // 新增
  // ...
};
```

在 `State` type 中新增：

```typescript
  activeCategory: Category;
  setActiveCategory: (c: Category) => void;
```

在 `useStore` 初始化中，`initialTask` 加上 `category: 'article'`：

```typescript
const initialTask = makeTask({ name: "任务 1", category: 'article' });
```

在初始 state 中加 `activeCategory: 'article' as Category`。

在 `Persisted` partialize 中加 `activeCategory: s.activeCategory`。

在 migration 中（v7 → v8），给旧数据加 `activeCategory: 'article'`。

- [ ] **Step 2: 在 makeTask 和 patchTask 中支持 category**

修改 `makeTask` 签名，接受 `category`：

```typescript
function makeTask(init?: Partial<Task>): Task {
  const now = Date.now();
  return {
    // ... 现有字段
    category: (init?.category ?? 'article') as Category,  // 新增
    // ...
  };
}
```

- [ ] **Step 3: 在 State 实现中添加 setActiveCategory**

```typescript
setActiveCategory: (c) => set({ activeCategory: c }),
```

在 `newTask` 中也用 `get().activeCategory` 作为新 task 的 category：

```typescript
newTask: (init) => {
  const tasks = get().tasks;
  const n = tasks.length + 1;
  const t = makeTask({ name: init?.name ?? `任务 ${n}`, category: get().activeCategory, ...init });
  // ...
}
```

- [ ] **Step 4: Store version 升级到 v8**

把 `version: 7` 改为 `version: 8`。

在 `migrate` 函数末尾新增 v7 → v8：

```typescript
// v7 → v8: introduce activeCategory (default 'article').
if (fromVersion < 8 && persisted && typeof persisted === "object") {
  const p = persisted as Record<string, unknown>;
  if (!p.activeCategory || typeof p.activeCategory !== "string" || !CATEGORIES.includes(p.activeCategory as Category)) {
    p.activeCategory = 'article';
  }
  // Also patch existing tasks that lack category field.
  if (Array.isArray(p.tasks)) {
    for (const t of p.tasks as Array<Record<string, unknown>>) {
      if (!t.category || typeof t.category !== "string" || !CATEGORIES.includes(t.category as Category)) {
        t.category = 'article';
      }
    }
  }
}
```

- [ ] **Step 5: 验证 typecheck 通过**

```bash
cd next && pnpm typecheck
```

Expected: PASS (no new errors)

- [ ] **Step 6: Commit**

```bash
git add next/src/lib/store.ts
git commit -m "feat: add category field to task and activeCategory to store

Adds Category type (article/invest/family/consult), activeCategory state,
migration v7→v8, and newTask auto-assigns current category.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: TopBar 分类导航

**Files:**
- Modify: `next/src/components/toolbar.tsx`

- [ ] **Step 1: 在 toolbar.tsx 中新增 CategoryPill 组件**

在 `Brand` 函数之后、`Toolbar` 函数之前，新增：

```typescript
import { useStore, CATEGORIES, CATEGORY_LABEL, type Category } from "@/lib/store";

function CategoryPill() {
  const active = useStore((s) => s.activeCategory);
  const setActive = useStore((s) => s.setActiveCategory);

  return (
    <div className="flex items-center gap-1">
      <div className="h-6 w-px" style={{ background: "var(--line)" }} />
      {CATEGORIES.map((c) => {
        const label = CATEGORY_LABEL[c];
        const isActive = active === c;
        return (
          <button
            key={c}
            onClick={() => setActive(c)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition-all"
            style={
              isActive
                ? { background: "var(--ink)", color: "var(--paper)" }
                : {
                    background: "transparent",
                    color: "var(--ink-soft)",
                    border: "1px solid var(--line-faint)",
                  }
            }
          >
            <span>{label.emoji}</span>
            <span>{label.zh}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: 在 Toolbar 的 header 中加入 CategoryPill**

在 `Toolbar` 组件的 `<div className="flex items-center gap-4">` 内部，`Brand` 之后、`CommunityLinks` 之前，加入 `<CategoryPill />`：

```tsx
<div className="flex items-center gap-4">
  <Brand />
  <CategoryPill />
  <CommunityLinks />
  {/* ... rest unchanged */}
```

- [ ] **Step 3: 验证 typecheck**

```bash
cd next && pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add next/src/components/toolbar.tsx
git commit -m "feat: add category navigation pill to TopBar

Categories: ✏️写文章 📈投资 🏠家庭 💼咨询. Active category highlighted
in ink color, others outlined. Placed between brand and community links.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: TasksSidebar 按分类过滤

**Files:**
- Modify: `next/src/components/tasks-sidebar.tsx`

- [ ] **Step 1: 在 tasks-sidebar.tsx 中加入分类过滤**

在 `TasksSidebar` 函数中，`tasks` 获取之后，新增：

```typescript
const activeCategory = useStore((s) => s.activeCategory);
```

修改 `filtered` 计算逻辑，在搜索过滤之前先按分类过滤：

```typescript
// First filter by active category
const categoryTasks = tasks.filter((t) => t.category === activeCategory);
// Then apply search query
const filtered = trimmed
  ? categoryTasks.filter((task) => {
      // ... 现有搜索逻辑不变
    })
  : categoryTasks;
```

同时修改 `tasks.length` 显示为 `categoryTasks.length`（显示当前分类的 task 数量）：

```typescript
// 在 collapsed 模式下
<div className="flex flex-1 flex-col items-center gap-1.5 overflow-y-auto px-1">
  {categoryTasks.map((task, i) => (  // 改为 categoryTasks
    // ...
  ))}
</div>
```

在"全部"模式下也需要把 `tasks.length` 改为 `categoryTasks.length`。

- [ ] **Step 2: 验证 typecheck**

```bash
cd next && pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add next/src/components/tasks-sidebar.tsx
git commit -m "feat: filter task sidebar by active category

Task list now only shows tasks belonging to the current category. Search
still works within the filtered set.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: 预览区模式切换器组件

**Files:**
- Create: `next/src/components/preview-mode-switcher.tsx`
- Modify: `next/src/components/preview-pane.tsx`

- [ ] **Step 1: 创建 preview-mode-switcher.tsx**

```typescript
"use client";

import { useState } from "react";
import { useStore, selectActiveTask } from "@/lib/store";

export type PreviewMode = "article" | "xhs" | "wechat-cover";

const MODES: { id: PreviewMode; label: string; emoji: string }[] = [
  { id: "article", label: "文章", emoji: "📝" },
  { id: "xhs", label: "小红书", emoji: "📱" },
  { id: "wechat-cover", label: "公众号封面", emoji: "📰" },
];

interface PreviewModeSwitcherProps {
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
  onOpenThemePicker: () => void;
}

export function PreviewModeSwitcher({ mode, onModeChange, onOpenThemePicker }: PreviewModeSwitcherProps) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-4 py-2"
      style={{ borderBottom: "1px solid var(--line-faint)", background: "var(--surface)" }}
    >
      <div className="flex gap-1">
        {MODES.map((m) => {
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] transition-all"
              style={
                isActive
                  ? { background: "var(--ink)", color: "var(--paper)" }
                  : { background: "transparent", color: "var(--ink-soft)", border: "1px solid transparent" }
              }
            >
              <span>{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
      {(mode === "xhs" || mode === "wechat-cover") && (
        <button
          onClick={onOpenThemePicker}
          className="rounded-lg px-2.5 py-1 text-[12px] transition-all"
          style={{
            background: "transparent",
            color: "var(--ink-soft)",
            border: "1px solid var(--line-faint)",
          }}
        >
          🎨 选择主题
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 在 preview-pane.tsx 中集成模式切换器**

在 `PreviewPane` 组件中，在 `isFullscreen` 判断之前添加模式切换状态：

```typescript
import { PreviewModeSwitcher, type PreviewMode } from "./preview-mode-switcher";

// 在 PreviewPane 组件内部：
const [previewMode, setPreviewMode] = useState<PreviewMode>("article");
const [themePickerOpen, setThemePickerOpen] = useState(false);
```

在 `!isFullscreen &&` 的现有 header div 之前，插入：

```tsx
{!isFullscreen && <PreviewModeSwitcher mode={previewMode} onModeChange={setPreviewMode} onOpenThemePicker={() => setThemePickerOpen(true)} />}
```

- [ ] **Step 3: 验证 typecheck**

```bash
cd next && pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add next/src/components/preview-mode-switcher.tsx next/src/components/preview-pane.tsx
git commit -m "feat: add preview mode switcher (article/xhs/wechat-cover)

Mode switcher sits above the existing preview tabs. 🎨 选择主题按钮
在小红书和公众号封面模式下显示。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: 6 个新 Skill（小红书 + 公众号封面主题）

**Files:**
- Create: `next/src/lib/templates/skills/xhs-big-poster/SKILL.md`
- Create: `next/src/lib/templates/skills/xhs-big-poster/example.html`
- Create: `next/src/lib/templates/skills/xhs-magazine/SKILL.md`
- Create: `next/src/lib/templates/skills/xhs-magazine/example.html`
- Create: `next/src/lib/templates/skills/xhs-minimal/SKILL.md`
- Create: `next/src/lib/templates/skills/xhs-minimal/example.html`
- Create: `next/src/lib/templates/skills/wc-magazine/SKILL.md`
- Create: `next/src/lib/templates/skills/wc-magazine/example.html`
- Create: `next/src/lib/templates/skills/wc-bold-title/SKILL.md`
- Create: `next/src/lib/templates/skills/wc-bold-title/example.html`
- Create: `next/src/lib/templates/skills/wc-gradient/SKILL.md`
- Create: `next/src/lib/templates/skills/wc-gradient/example.html`

每个 skill 的 `SKILL.md` 遵循现有协议。小红书 skill 的 `example.html` 展示 1080×1440 的静态卡片。公众号封面 skill 的 `example.html` 展示 900×383 的静态横幅。

- [ ] **Step 1: xhs-big-poster**

`SKILL.md`:
```markdown
---
zh_name: 大字报
en_name: Big Poster
emoji: 🔥
description: 标题超大，留白多，重点句高亮。适合观点型/金句型内容。
category: social
scenario: personal
aspect_hint: 大字 × 留白
tags: ["xhs", "poster", "big-text"]
---

你是一个小红书内容排版专家。将用户提供的 Markdown 内容排版成**大字报风格**的卡片，尺寸 1080×1440px。

## 硬约束
- 容器宽度 1080px，高度 1440px
- 所有 CSS 内联（inline style 或 <style> 标签）
- CJK-first 字体栈
- 8px 基线网格
- 标题字号 ≥ 48px
- 正文段落字号 24-28px
- 重点句子用高亮色（#FF6B6B 或类似）标注
- 大量留白（padding ≥ 60px）
- 背景用暖色（#FAF8F5 或类似）
```

`example.html`：一个静态的 1080×1440 大字报风格卡片。

- [ ] **Step 2: xhs-magazine**

`SKILL.md`:
```markdown
---
zh_name: 杂志卡片
en_name: Magazine Card
emoji: 📖
description: 精致段落，均匀间距，知识感。适合干货/教程型内容。
category: social
scenario: personal
aspect_hint: 杂志排版
tags: ["xhs", "magazine", "editorial"]
---

你是一个小红书内容排版专家。将用户提供的 Markdown 内容排版成**杂志卡片风格**的卡片，尺寸 1080×1440px。

## 硬约束
- 容器宽度 1080px，高度 1440px
- 所有 CSS 内联
- CJK-first 字体栈
- 8px 基线网格
- 标题使用 serif 字体
- 正文行高 1.8-2.0
- 段落间距 16-24px
- 可加入装饰线/分隔线
- 背景可用浅纹理（点阵/条纹）
```

`example.html`：一个静态的 1080×1440 杂志风格卡片。

- [ ] **Step 3: xhs-minimal**

`SKILL.md`:
```markdown
---
zh_name: 极简白底
en_name: Minimal White
emoji: ⬜
description: 干净纯白，大段文字直接展示。适合长文/深度阅读。
category: social
scenario: personal
aspect_hint: 极简白底
tags: ["xhs", "minimal", "clean"]
---

你是一个小红书内容排版专家。将用户提供的 Markdown 内容排版成**极简白底风格**的卡片，尺寸 1080×1440px。

## 硬约束
- 容器宽度 1080px，高度 1440px
- 所有 CSS 内联
- 纯白背景（#FFFFFF）
- 正文字号 22-26px，行高 1.7
- 标题 32-36px
- 无装饰元素，极简主义
- padding 40-48px
```

`example.html`：一个静态的 1080×1440 极简白底卡片。

- [ ] **Step 4: wc-magazine（公众号封面-杂志风）**

`SKILL.md`:
```markdown
---
zh_name: 杂志风
en_name: Magazine Cover
emoji: 🎨
description: 公众号头条封面，杂志排版风格。含标题+摘要+背景装饰。
category: marketing
scenario: personal
aspect_hint: 杂志封面
tags: ["wechat", "cover", "magazine"]
---

你是一个公众号封面设计专家。根据用户提供的文章，生成一个**杂志风格**的头条封面，尺寸 900×383px。

## 硬约束
- 容器宽度 900px，高度 383px
- 所有 CSS 内联
- 包含：醒目标题 + 副标题/摘要 + 背景装饰
- **重要内容居中**（分享到朋友圈时会被裁切为 1:1 正方形）
- CJK-first 字体栈
```

`example.html`：一个静态的 900×383 杂志风封面。

- [ ] **Step 5: wc-bold-title（公众号封面-大字标题）**

`SKILL.md`:
```markdown
---
zh_name: 大字标题
en_name: Bold Title Cover
emoji: 🔤
description: 公众号头条封面，超大标题风格。
category: marketing
scenario: personal
aspect_hint: 超大标题
tags: ["wechat", "cover", "bold"]
---

你是一个公众号封面设计专家。根据用户提供的文章，生成一个**大字标题风格**的头条封面，尺寸 900×383px。

## 硬约束
- 容器宽度 900px，高度 383px
- 所有 CSS 内联
- 标题字号 ≥ 48px，占据主要视觉空间
- 副标题/摘要字号 16-20px
- **重要内容居中**
```

`example.html`：一个静态的 900×383 大字标题封面。

- [ ] **Step 6: wc-gradient（公众号封面-渐变背景）**

`SKILL.md`:
```markdown
---
zh_name: 渐变背景
en_name: Gradient Cover
emoji: 🌈
description: 公众号头条封面，渐变背景风格。
category: marketing
scenario: personal
aspect_hint: 渐变背景
tags: ["wechat", "cover", "gradient"]
---

你是一个公众号封面设计专家。根据用户提供的文章，生成一个**渐变背景风格**的头条封面，尺寸 900×383px。

## 硬约束
- 容器宽度 900px，高度 383px
- 所有 CSS 内联
- 使用 CSS 渐变背景（linear-gradient）
- 文字用白色确保可读性
- **重要内容居中**
```

`example.html`：一个静态的 900×383 渐变背景封面。

- [ ] **Step 7: Commit**

```bash
git add next/src/lib/templates/skills/xhs-big-poster next/src/lib/templates/skills/xhs-magazine next/src/lib/templates/skills/xhs-minimal next/src/lib/templates/skills/wc-magazine next/src/lib/templates/skills/wc-bold-title next/src/lib/templates/skills/wc-gradient
git commit -m "feat: add 6 new skills (3 xhs + 3 wechat cover themes)

XHS: 大字报/杂志卡片/极简白底 (1080×1440)
WeChat: 杂志风/大字标题/渐变背景 (900×383)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: 改写根目录 Markdown 文件

**Files:**
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md`
- Modify: `README.md`

- [ ] **Step 1: 改写 CLAUDE.md**

```markdown
# CLAUDE.md

**个人内容工作台** — 微信公众号 & 小红书内容发布工具。

## 定位

用 AI 把 Markdown 文章变成：
- 📱 小红书卡片图片（1080×1440，AI 智能分页）
- 📰 公众号头条封面（900×383）
- 📝 文章预览 + WeChat 兼容的 HTML 复制

## 架构

- `next/` — Next.js 应用
- `e2e/` — Playwright 测试

## 命令

```bash
pnpm install --frozen-lockfile
pnpm -F @html-anything/next dev   # → http://localhost:3000
pnpm -F @html-anything/next typecheck
pnpm -F @html-anything/next test
pnpm -F @html-anything/next build
```

## 分类

工作区按分类组织：✏️ 写文章 · 📈 投资 · 🏠 家庭关系 · 💼 企业咨询
```

- [ ] **Step 2: 改写 AGENTS.md**

```markdown
# AGENTS.md

## 工作区形状

- 根目录是公共 harness 边界
- `next/` 拥有完整的 Next 应用
- `e2e/` 拥有浏览器测试

## 命令

- Install: `pnpm install --frozen-lockfile`
- App dev: `pnpm -F @html-anything/next dev`
- App typecheck: `pnpm -F @html-anything/next typecheck`
- App unit tests: `pnpm -F @html-anything/next test`
- App build: `pnpm -F @html-anything/next build`
- E2E tests: `pnpm -F @html-anything/e2e test`
```

- [ ] **Step 3: 改写 README.md**

将 README 改写为个人工作台定位，简要说明：
- 这是一个什么工具
- 核心能力（小红书卡片、公众号封面）
- 快速开始
- 分类导航
- 保留的现有能力（agent 后端、模板系统等）

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md AGENTS.md README.md
git commit -m "docs: rewrite root markdown files for personal workbench positioning

CLAUDE.md, AGENTS.md, README.md now describe the personal content
workbench focused on WeChat & Xiaohongshu publishing.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: 验证整体功能

**Files:**
- No file changes

- [ ] **Step 1: 完整 typecheck**

```bash
pnpm -F @html-anything/next typecheck
```

- [ ] **Step 2: 运行测试**

```bash
pnpm -F @html-anything/next test
```

- [ ] **Step 3: 构建验证**

```bash
pnpm -F @html-anything/next build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: 最终 commit（如果需要）**

如果前面步骤中有测试/构建发现的问题，在此修复并 commit。

---

## 任务依赖关系

```
Task 1 (Store)
    │
    ├──→ Task 2 (TopBar 分类导航)
    │        │
    │        └──→ Task 3 (Sidebar 过滤)
    │
    └──→ Task 4 (预览区模式切换器)
    │
    └──→ Task 5 (6 个新 Skill)
    │
    └──→ Task 6 (根目录 Markdown 改写)
    │
    └──→ Task 7 (验证)
```

## 不做的（Scope Out）

- ❌ AI 封面生成（后续任务，本计划只做 UI 框架 + skill 模板）
- ❌ AI 智能分页（后续任务，本计划只做模式切换 UI + skill 模板）
- ❌ 小红书卡片自动下载（后续任务，复用现有 modern-screenshot 导出）
- ❌ 主题库弹出面板（复用现有 TemplatePicker，不改组件）

## 验证清单

完成后验证：
- [ ] TopBar 显示 4 个分类 pill，点击切换高亮
- [ ] 左侧任务列表只显示当前分类的 task
- [ ] 新建 task 自动归属当前分类
- [ ] 预览区顶部显示模式切换 pill（文章/小红书/公众号封面）
- [ ] 小红书模式下显示 🎨 选择主题按钮
- [ ] 公众号封面模式下也能 🎨 选择主题
- [ ] 6 个新 skill 在 TemplatePicker 中可见
- [ ] typecheck / test / build 全部通过
