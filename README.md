# 电影随机选择器

一个无需安装依赖的中文电影随机选择网页。它可以从内置的 15 部高分电影中随机挑选影片，也支持按名称搜索、查看简介、五星评分和记录个人影评。

## 在线体验

[打开 GitHub Pages](https://zyhm0220.github.io/movie-picker/)

## 页面风格

- [经典电影随机选择器](./index.html)
- [影轮 CineSpin 桌面转盘版](styles/neon-wheel/)

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
├─ index.html                    # 经典页面、样式、电影数据和交互逻辑
├─ shared/                       # 新风格页面共享的电影和影评逻辑
├─ styles/
│  └─ neon-wheel/               # 影轮 CineSpin 桌面转盘页面
├─ tests/                        # Node 内置测试运行器测试
├─ docs/superpowers/            # 设计规格和实施计划
├─ README.md                     # 项目说明
├─ .gitignore                    # 本地工具临时文件忽略规则
└─ 视觉风格素材/                 # 设计探索参考图
```

## 数据说明

- 电影列表、评分和简介直接内置在 `index.html`，不会实时请求豆瓣数据。
- 海报从 `https://image.tmdb.org` 加载，因此显示海报时需要联网。
- 个人评分和影评只保存在当前浏览器的 `movie_reviews` 本地存储项中，不会上传到服务器。

## 视觉参考

- [电影抽取交互方案合集](视觉风格素材/1b7b8f3d-8ced-4ab5-be78-6f0e62439d8a.png)
- [深色电影页面风格合集](视觉风格素材/af40454a-6db1-483c-8c95-84d0b94f1cb8.png)
