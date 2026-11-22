# StudySpark · AI 学习卡片工坊 —— 使用说明

> 粘贴任意学习笔记，AI 一键生成可翻转闪卡与自测选择题，支持在线刷题、计分与导出 Markdown。

## 一、快速开始

本项目是**纯前端静态应用**，无需安装、无需构建、无需后端：

| 方式 | 操作 |
|------|------|
| **直接打开**（最简单） | 双击 `index.html`，用浏览器打开即可使用 |
| **本地服务器**（推荐开发时） | 在 `app/` 目录执行 `python -m http.server 8080`，访问 `http://localhost:8080` |
| **在线访问** | 见 `../WangChunYan_C6_app链接.md` 中的已部署公网地址 |

## 二、功能一览

| 功能 | 说明 |
|------|------|
| ✍️ 文本输入 | 粘贴笔记，或上传 `.txt` / `.md` 文件（≤ 2MB） |
| ✨ 示例材料 | 点「试试示例」一键填入示例文本 |
| ⚡ AI 生成 | 生成填空式闪卡（5/10/15 张）+ 四选一自测题 |
| 🃏 闪卡翻转 | 点击卡片 3D 翻面看答案，支持键盘操作（Tab + 回车） |
| 📝 自测刷题 | 即时判分、显示解析、统计正确率、可一键重测 |
| 📤 导出 | 一键复制 / 下载 Markdown 学习卡片集 |
| ⚙️ AI 设置 | 接入 DeepSeek / OpenAI / Moonshot / 任意 OpenAI 兼容接口 |
| 🎈 演示模式 | 不配 API Key 也能完整体验（本地规则出题） |

## 三、AI 模式 vs 演示模式

| | 演示模式（默认） | AI 模式 |
|---|---|---|
| 是否需要 Key | ❌ 不需要 | ✅ 需要自填 API Key |
| 出题方式 | 本地关键词抽取规则 | 大语言模型理解材料后生成 |
| 题目质量 | 填空式、基于原句 | 多样化、有迷惑性干扰项、带解析 |
| 适用场景 | 先体验流程 | 日常真实学习使用 |

**开启 AI 模式：** 点击右上角「设置」→ 选择服务商（推荐 DeepSeek）→ 填入 API Key → 保存。

🔒 **安全说明：** API Key 仅保存在您自己的浏览器 localStorage 中，由浏览器直接请求 AI 服务商，不会上传到本应用的任何服务器，也**绝没有硬编码在源码里**。

## 四、目录结构与代码导读

```
app/
├── index.html        # 页面结构 + Tailwind 样式 + 自定义 CSS（卡片翻转/题目/弹窗）
├── README.md         # 本文件
└── js/
    ├── demo-data.js  # 演示模式：关键词抽取 → 填空卡 + 选择题（含示例文本与兜底题库）
    ├── ai.js         # AI 调用：提示词工程 + fetch 调 LLM + JSON 解析校验
    └── app.js        # 界面逻辑：生成流程、渲染闪卡/题目/导出、设置弹窗、事件绑定
```

**调用链路：**

```
用户点击「开始生成」（app.js: handleGenerate）
   → 读取文本与参数
   → ai.js: generateStudySet()
        ├─ 无 Key → demo-data.js: demoGenerate()   （演示模式）
        └─ 有 Key → callLLM() 调用大模型 → parseStudySet() 校验
   → app.js: renderAll() 渲染闪卡 / 自测题 / Markdown 导出
```

三个 JS 文件均带**逐段中文注释**，可按上面的调用链路顺序阅读：`demo-data.js` → `ai.js` → `app.js`。

## 五、技术栈

- 前端：HTML5 + Tailwind CSS（CDN）+ 原生 JavaScript（无框架、零构建）
- AI：OpenAI 兼容 `chat/completions` 接口（默认 DeepSeek）
- 部署：静态托管（WorkBuddy 站点部署 / 任何静态空间均可）

## 六、浏览器兼容

Chrome / Edge / Firefox / Safari / 手机浏览器（响应式布局，移动端单列展示）。
