# Movie Picker Repository Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 整理 Movie Picker 仓库，使根目录页面、Git 状态、Claude Code worktree 忽略规则、项目说明和视觉参考素材处于可维护且可推送的状态。

**Architecture:** 保持现有 `index.html` 单文件静态页面不变，只处理仓库外围结构。Git worktree 使用 Git 原生命令清理，Claude Code 的临时 worktree 通过精确忽略规则排除；README 和现有图片作为项目文档纳入版本控制。

**Tech Stack:** Git、PowerShell、HTML/CSS/JavaScript、浏览器 `localStorage`、Python 静态 HTTP 服务器

## Global Constraints

- 不修改 `index.html` 的页面功能、布局、配色、交互或电影数据。
- 不拆分 HTML、CSS 和 JavaScript。
- 不引入框架、包管理器、构建流程、后端或数据库。
- `.gitignore` 只忽略 `.claude/worktrees/`，不忽略整个 `.claude/`。
- 保留“视觉风格素材”现有目录名和两个图片文件名。
- 不删除远程功能分支。
- 每完成一个任务先验证，再提交；最终验证通过后才推送 `main`。

---

## File Map

- Create: `.gitignore` — 仅声明 Claude Code 临时 worktree 的忽略规则。
- Create: `README.md` — 项目用途、功能、运行方式、存储说明和素材索引。
- Track: `视觉风格素材/1b7b8f3d-8ced-4ab5-be78-6f0e62439d8a.png` — 电影抽取交互方向参考。
- Track: `视觉风格素材/af40454a-6db1-483c-8c95-84d0b94f1cb8.png` — 深色电影页面视觉参考。
- Remove locally: `.claude/worktrees/movie-picker/` — 已失效且与根目录页面重复的本地副本；该目录当前未被 Git 跟踪。
- Preserve unchanged: `index.html` — 唯一正式网页入口。

### Task 1: 清理失效 worktree 并添加精确忽略规则

**Files:**
- Create: `.gitignore`
- Remove locally: `.claude/worktrees/movie-picker/`
- Verify unchanged: `index.html`

**Interfaces:**
- Consumes: Git 中登记的旧 worktree 路径 `C:/Users/联想/my-first-github-project/.claude/worktrees/movie-picker`。
- Produces: 只包含有效主工作区的 worktree 列表，以及对 `.claude/worktrees/` 生效的 Git 忽略规则。

- [ ] **Step 1: 记录清理前状态和页面哈希**

Run:

```powershell
git status --short --branch
git worktree list --porcelain
git hash-object index.html
```

Expected:

- `main` 比 `origin/main` 领先已提交的设计/计划文档。
- worktree 列表包含当前主目录和旧的、被锁定的 `movie-picker` worktree。
- `index.html` 哈希为 `9239b2389eb17401f12320a6a7b51d3809aa69d3`。

- [ ] **Step 2: 使用 Git 命令解除并清理旧 worktree 登记**

Run:

```powershell
git worktree unlock 'C:/Users/联想/my-first-github-project/.claude/worktrees/movie-picker'
git worktree prune --expire now --verbose
git worktree list --porcelain
```

Expected: 最后一条命令只显示 `C:/Users/联想/Documents/movie-picker` 主工作区，不再显示旧目录。

- [ ] **Step 3: 验证删除目标位于当前仓库，再删除失效副本**

Run:

```powershell
$root = (Resolve-Path -LiteralPath '.').Path
$target = (Resolve-Path -LiteralPath '.claude\worktrees\movie-picker').Path
$prefix = $root + [IO.Path]::DirectorySeparatorChar
if (-not $target.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw "拒绝删除仓库外路径：$target"
}
$target
Remove-Item -Recurse -Force -LiteralPath $target
Test-Path -LiteralPath $target
```

Expected: 删除前输出的绝对路径位于 `C:\Users\联想\Documents\movie-picker\` 下，最后输出 `False`。

- [ ] **Step 4: 创建 `.gitignore`**

Create `.gitignore` with exactly:

```gitignore
# Claude Code local worktrees
.claude/worktrees/
```

- [ ] **Step 5: 验证忽略规则和页面未改变**

Run:

```powershell
git check-ignore -v --no-index '.claude/worktrees/example/index.html'
git hash-object index.html
git diff --check
git status --short
```

Expected:

- `git check-ignore` 指向 `.gitignore` 的第 2 行。
- 页面哈希仍为 `9239b2389eb17401f12320a6a7b51d3809aa69d3`。
- `git diff --check` 无输出。
- 状态包含新的 `.gitignore`、README 尚未创建时的素材目录，不包含 `.claude/`。

- [ ] **Step 6: 提交 worktree 清理规则**

Run:

```powershell
git add -- .gitignore
git diff --cached --check
git diff --cached --stat
git commit -m "chore: ignore local Claude worktrees"
```

Expected: 提交只新增 `.gitignore`，不修改 `index.html`。

### Task 2: 添加项目说明并纳管视觉参考素材

**Files:**
- Create: `README.md`
- Track: `视觉风格素材/1b7b8f3d-8ced-4ab5-be78-6f0e62439d8a.png`
- Track: `视觉风格素材/af40454a-6db1-483c-8c95-84d0b94f1cb8.png`

**Interfaces:**
- Consumes: 根目录 `index.html`、GitHub Pages 地址和两个现有 PNG 文件。
- Produces: 面向使用者和维护者的仓库入口文档，以及可从 README 访问的视觉参考文件。

- [ ] **Step 1: 创建 README**

Create `README.md` with exactly:

```markdown
# 电影随机选择器

一个无需安装依赖的中文电影随机选择网页。它可以从内置的 15 部高分电影中随机挑选影片，也支持按名称搜索、查看简介、五星评分和记录个人影评。

## 在线体验

[打开 GitHub Pages](https://zyhm0220.github.io/movie-picker/)

## 主要功能

- 随机选择一部电影
- 按电影名称搜索和简单模糊匹配
- 展示类型、内置豆瓣评分、简介和 TMDB 海报
- 五星评分并保存个人影评
- 编辑或删除观影记录
- 使用浏览器 `localStorage` 保存数据

## 本地运行

项目不需要安装依赖。可以直接打开 `index.html`，也可以在项目目录启动静态服务器：

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

然后访问 <http://127.0.0.1:8000/>。

## 项目结构

```text
movie-picker/
├─ index.html          # 页面、样式、电影数据和交互逻辑
├─ README.md           # 项目说明
├─ .gitignore          # 本地工具临时文件忽略规则
└─ 视觉风格素材/       # 设计探索参考图
```

## 数据说明

- 电影列表、评分和简介直接内置在 `index.html`，不会实时请求豆瓣数据。
- 海报从 `https://image.tmdb.org` 加载，因此显示海报时需要联网。
- 个人评分和影评只保存在当前浏览器的 `movie_reviews` 本地存储项中，不会上传到服务器。

## 视觉参考

- [电影抽取交互方案合集](视觉风格素材/1b7b8f3d-8ced-4ab5-be78-6f0e62439d8a.png)
- [深色电影页面风格合集](视觉风格素材/af40454a-6db1-483c-8c95-84d0b94f1cb8.png)
```

- [ ] **Step 2: 验证 README 内容和素材文件**

Run:

```powershell
Test-Path -LiteralPath 'README.md'
Test-Path -LiteralPath '视觉风格素材\1b7b8f3d-8ced-4ab5-be78-6f0e62439d8a.png'
Test-Path -LiteralPath '视觉风格素材\af40454a-6db1-483c-8c95-84d0b94f1cb8.png'
Get-ChildItem -LiteralPath '视觉风格素材' -File | Select-Object Name,Length
git diff --check
```

Expected: 三个 `Test-Path` 均输出 `True`；两张图片大小均大于 1 MB；`git diff --check` 无输出。

- [ ] **Step 3: 提交 README 和视觉素材**

Run:

```powershell
git add -- README.md '视觉风格素材'
git diff --cached --check
git diff --cached --stat
git commit -m "docs: add project guide and design references"
```

Expected: 提交包含 `README.md` 和两个 PNG 文件，不包含 `index.html`。

### Task 3: 浏览器冒烟验证并推送 main

**Files:**
- Verify unchanged: `index.html`
- No repository files created or modified.

**Interfaces:**
- Consumes: 已整理的静态仓库和浏览器 `localStorage`。
- Produces: 通过验证且已推送的 `main` 分支。

- [ ] **Step 1: 启动本地静态服务器**

Run and keep the process active:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Expected: 输出 `Serving HTTP on 127.0.0.1 port 8000`。

- [ ] **Step 2: 验证 HTTP 页面入口**

Run in another terminal:

```powershell
$response = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8000/'
$response.StatusCode
$response.Content -match '<title>🎬 电影随机选择器</title>'
```

Expected: 依次输出 `200` 和 `True`。

- [ ] **Step 3: 使用浏览器完成搜索和随机选择冒烟验证**

Open `http://127.0.0.1:8000/` in a fresh browser context, then:

1. 在输入框输入 `肖申克的救赎`，点击“确认”。
2. 确认结果标题为“肖申克的救赎”，豆瓣评分显示 `9.7`。
3. 点击“随机选一个”。
4. 确认结果卡片仍可见，并展示内置电影库中的一部影片。

Expected: 搜索结果准确，随机按钮可独立工作，页面无脚本错误。

- [ ] **Step 4: 使用浏览器完成影评生命周期冒烟验证**

In the same browser context:

1. 搜索 `肖申克的救赎`。
2. 选择 3 星，输入影评 `基础整理验证`，点击“保存影评”。
3. 确认“我的观影历史”出现该影片、3 星、影评文字和当天日期。
4. 点击“编辑”，确认星级和文字回填。
5. 将文字改为 `基础整理验证已编辑` 并保存，确认历史记录更新。
6. 点击“删除”并确认，确认测试记录从历史中消失。

Expected: 保存、读取、编辑和删除均正常，测试结束后不遗留测试记录。

- [ ] **Step 5: 停止静态服务器并执行最终 Git 检查**

Stop the server with `Ctrl+C`, then run:

```powershell
git diff --exit-code -- index.html
git diff --cached --exit-code
git status --short --branch
git log --oneline --decorate -5
git remote --verbose
git worktree list --porcelain
```

Expected:

- 两条 `git diff` 命令均无输出并返回成功。
- 工作区干净，`main` 只领先尚未推送的整理提交。
- `origin` 为 `https://github.com/zyhm0220/movie-picker.git`。
- worktree 列表只包含当前主工作区。

- [ ] **Step 6: 推送并确认同步状态**

Run:

```powershell
git push origin main
git status --short --branch
git ls-remote --heads origin main
```

Expected:

- 推送成功。
- 状态显示 `## main...origin/main`，没有领先、落后或未跟踪文件。
- `git ls-remote` 返回的 `main` 提交哈希与本地 `git rev-parse HEAD` 一致。

如果任一浏览器功能验证失败，停止推送并报告失败步骤；修复页面行为不属于本次基础整理范围，需要单独确认。
