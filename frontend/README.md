# 文档前端站（frontend）

这个目录是独立的文档前端，不会影响你原本的 `README.md` 和 `docs/*.md` 维护方式。

## 目标

- 保留当前仓库 Markdown 作为唯一真源
- 自动读取仓库里的 `.md` 内容并渲染成网页
- 支持同时保留 GitHub 原生文档阅读入口

## 本地开发

```bash
cd frontend
npm install
npm run dev
```

打开 `http://localhost:3000`。

- 中文首页: `http://localhost:3000/`
- 英文首页: `http://localhost:3000/en/`

## 构建输出（静态）

```bash
cd frontend
npm run build
```

静态文件会输出到 `frontend/out/`，可直接部署到静态托管平台。

## 自动同步机制

- 页面内容在构建时直接读取仓库中的 Markdown 文件（包括 `README*.md` 和 `docs/` 下文档）
- 每次构建前会运行 `scripts/sync-assets.mjs`，自动复制 Markdown 中引用到的图片/附件到 `frontend/public/`
- 你只改 Markdown，前端不需要手动同步内容
- 默认会根据浏览器语言自动进入中文或英文首页，用户手动切换后会记住偏好
- 前端按语言分流展示中英文文档，避免混排
- 站点改动统一记录在根目录 `changelogs/`（含前端变更）

## 部署建议

### Vercel

1. Import 当前 GitHub 仓库
2. Root Directory 设为 `frontend`
3. Build Command: `npm run build`
4. Output Directory: `out`
5. 开启自动部署（默认开启）

之后只要你 push 修改了根目录 `README.md` 或 `docs/*.md`，Vercel 会自动重建，站点内容同步更新。

### EdgeOne Pages（静态托管）

1. 连接 Git 仓库
2. 项目目录设为 `frontend`
3. 构建命令：`npm run build`
4. 发布目录：`out`

同样可通过 Git 推送触发自动构建。
