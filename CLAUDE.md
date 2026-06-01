# CLAUDE.md

**个人内容工作台** — 微信公众号 & 小红书内容发布工具。

## 定位

用 AI 把 Markdown 文章变成：
- 📱 小红书卡片图片（1080×1440，AI 智能分页）
- 📰 公众号头条封面（900×383）
- 📝 文章预览 + WeChat 兼容的 HTML 复制

## 架构

- `next/` — Next.js 16 应用（App Router, React 19, zustand, Tailwind v4）
- `e2e/` — Playwright 浏览器测试

## 命令

```bash
pnpm install --frozen-lockfile
pnpm -F @html-anything/next dev        # → http://localhost:3000
pnpm -F @html-anything/next typecheck
pnpm -F @html-anything/next test
pnpm -F @html-anything/next build
```

## 分类

工作区按分类组织：**✏️ 写文章** · **📈 投资** · **🏠 家庭关系** · **💼 企业咨询**

每个分类有独立的任务列表。新建任务自动归属当前选中的分类。
