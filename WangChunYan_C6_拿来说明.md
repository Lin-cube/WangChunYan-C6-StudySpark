# WangChunYan_C6_拿来说明（ATTRIBUTION）

| 项目 | 内容 |
|------|------|
| 姓名 | WangChunYan |
| 学号 | 2023105110151 |
| 挑战 | C6 Web Application |

> 对应 CHALLENGE.md 第十节「拿来主义」：用了什么模板、什么组件库、参考了哪个产品的设计，全部写清楚。

## 一、直接引用的开源资源

| 资源 | 版本/来源 | 用途 | 修改方式 |
|------|-----------|------|----------|
| **Tailwind CSS** | Play CDN（cdn.tailwindcss.com） | 页面布局、响应式栅格、按钮/卡片样式 | 通过 `tailwind.config` 自定义品牌色（靛蓝-紫罗兰），局部样式改写为自定义 CSS |
| **系统字体栈** | PingFang SC / Microsoft YaHei / Segoe UI / system-ui | 中文渲染 | 无修改，保证 < 5 秒加载 |

> 无其他 npm 依赖、无 UI 组件库整包引入——三个 JS 文件全部为本项目手写（AI 辅助生成 + 人工迭代）。

## 二、交互模式的参考来源（学习后改造，非代码复制）

| 参考对象 | 借鉴了什么 | 怎么改 |
|----------|-----------|--------|
| Anki / Quizlet 等记忆卡产品 | 「问题正面 / 答案背面」的翻转卡片交互 | 用纯 CSS 3D transform 自实现（`transform-style: preserve-3d` + `backface-visibility`），不引第三方库 |
| 在线答题 / 刷题类产品 | 四选一即时判分 + 解析展示 + 正确率统计 | 增加「重测」与逐题解析，选项按钮式布局更适合手机 |
| 挑战文档 CHALLENGE.md 示例 2（skill-explainer Web App） | 「上传/粘贴 → 分析 → 结构化展示 → 导出 Markdown」的多步骤 workflow 骨架 | 换场景为学习材料 → 闪卡 + 自测题，导出物为学习卡片集 |

## 三、产品内 AI 能力的归属

| 项 | 说明 |
|----|------|
| AI 接口 | OpenAI 兼容 `chat/completions` 协议；预设 DeepSeek / OpenAI / Moonshot / 自定义 Base URL |
| 提示词 | 本项目自写（见 `app/js/ai.js` 的 SYSTEM_PROMPT，设计过程见 AI 日志第三节） |
| API Key | 用户自填（BYOK），仅存浏览器 localStorage，**源码中零硬编码** |

## 四、素材与文本

| 项 | 来源 |
|----|------|
| 示例学习材料（费曼学习法） | 公开学习方法知识，由 AI 整理撰写为演示文本 |
| 兜底题库 | 同上，基于示例材料自拟 |
| 图标 | 使用 Emoji（⚡🃏📝📤⚙️ 等），无图标库依赖 |

## 五、声明

- 本产品未整包复制任何商业产品的代码或界面样式；
- 所有「拿来」的部分均在上表列出并说明改造方式；
- 开发过程全程 AI 辅助（WorkBuddy），使用记录见 `WangChunYan_C6_AI日志.md`。
