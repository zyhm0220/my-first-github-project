# Movie Picker 仓库基础整理设计

## 背景

项目是一个无需构建工具的单文件静态网页。远程 `main` 已包含完整的 `index.html`，本地此前停留在初始提交，并遗留了 Claude Code 创建的失效 worktree 副本。仓库还缺少 README 和忽略规则，两张视觉参考图尚未纳入版本控制。

## 目标

- 让本地 `main` 与重命名后的 GitHub 仓库保持一致。
- 保证根目录 `index.html` 是唯一正式页面入口。
- 清理失效的 Claude Code worktree，但不影响以后继续使用 Claude Code。
- 补充最小必要的仓库说明和忽略规则。
- 将现有视觉参考图纳入版本控制。
- 验证现有页面可以正常运行，且不改变功能和视觉。

## 非目标

- 不拆分 HTML、CSS 和 JavaScript。
- 不引入框架、包管理器或构建流程。
- 不新增登录、后端、数据库、支付或用户系统。
- 不调整页面布局、配色、交互或电影数据。
- 不删除远程功能分支。

## 目标结构

```text
movie-picker/
├─ index.html
├─ README.md
├─ .gitignore
├─ 视觉风格素材/
│  ├─ 1b7b8f3d-8ced-4ab5-be78-6f0e62439d8a.png
│  └─ af40454a-6db1-483c-8c95-84d0b94f1cb8.png
└─ docs/superpowers/specs/
   └─ 2026-07-15-repository-foundation-design.md
```

Claude Code 将来仍可在本地重新创建 `.claude/worktrees/`，但该目录不会进入 Git。

## Git 与 worktree 整理

1. 将 `origin` 指向 `https://github.com/zyhm0220/movie-picker.git`。
2. 使用仅快进方式同步远程 `main`，保留已有提交和 PR 合并历史。
3. 确认根目录 `index.html` 与远程 `main` 一致，不从 `.claude` 手动复制。
4. 使用 Git 自身的 worktree 命令解除并清理失效登记，不直接修改 `.git` 内部文件。
5. 删除已经冗余的 `.claude/worktrees/movie-picker` 本地副本。
6. `.gitignore` 只忽略 `.claude/worktrees/`，不忽略整个 `.claude/`，以便未来按需提交 Claude Code 项目配置。

## 文档与素材

README 将说明项目用途、主要功能、目录结构、运行方式、数据存储方式和外部海报依赖。视觉参考图保留现有目录名与文件名，避免本轮产生无必要的路径改动，并由 README 标注其用途。

## 验证方式

- `git remote --verbose` 显示新的仓库地址。
- `git worktree list` 只包含有效工作区。
- `git status --short --branch` 不再显示 `.claude/worktrees/`。
- 根目录页面通过本地静态服务器正常打开。
- 搜索、随机选择、星级评分、影评保存、编辑和删除通过浏览器冒烟验证。
- 页面仍使用浏览器 `localStorage` 保存影评，海报仍从 TMDB 图片地址加载。
- 最终整理提交推送后，本地 `main` 与 `origin/main` 同步。

## 提交边界

设计文档单独提交。实际整理使用一个聚焦的 `chore` 提交，包含 `.gitignore`、README、视觉素材纳管和 worktree 清理后的仓库状态；不夹带功能修改。
