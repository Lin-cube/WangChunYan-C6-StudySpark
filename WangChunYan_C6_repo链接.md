# WangChunYan_C6_repo链接

| 项目 | 内容 |
|------|------|
| 姓名 | WangChunYan |
| 学号 | 2023105110151 |
| 挑战 | C6 Web Application |

## 源码仓库

| 项 | 值 |
|----|----|
| 本地仓库路径 | `WangChunYan_C6_2023105110151/`（本提交包根目录，含产品源码 `app/` 与全部交付文档） |
| 分支 | `main` |
| 建议 GitHub 仓库名 | `WangChunYan-C6-StudySpark` |
| 远程仓库地址 | ⬜ 待推送后填写：`https://github.com/<你的GitHub用户名>/WangChunYan-C6-StudySpark.git` |

## Git 提交记录（本地已就绪，提交信息清晰可追溯）

```
feat: StudySpark Web 应用——AI 闪卡+自测题生成（含演示模式与响应式布局）
docs: 初始化 C6 提交包，明确挑战内容、要求与预期输出
docs: 补齐 C6 全部交付文档（app链接/repo链接/AI日志/拿来说明/AAR/demo脚本）
```

## 推送到 GitHub 的步骤（3 分钟）

```bash
# 1. 在 GitHub 网页上新建空仓库 WangChunYan-C6-StudySpark（不要勾选 README）

# 2. 在本目录执行（把 <你的GitHub用户名> 换成你的账号）：
cd WangChunYan_C6_2023105110151
git remote add origin https://github.com/<你的GitHub用户名>/WangChunYan-C6-StudySpark.git
git push -u origin main

# 3. 推送完成后，把远程地址填回上面的表格，并同步更新本文件
```

## 与 C5 的联动建议

如已有 C5 开源仓库，可将 `app/` 目录内容放入同一 repo 的 `study-spark/` 子目录，
一次 push 同时贡献 C5（项目协作）与 C6（产品交付），实现「一石二鸟」。

## 目录结构（仓库即提交包）

```
WangChunYan-C6-StudySpark/
├── README.md                        # 项目总说明（C6 内容/要求/预期输出）
├── WangChunYan_C6_app链接.md        # 部署 URL + 产品说明
├── WangChunYan_C6_repo链接.md       # 本文件
├── WangChunYan_C6_AI日志.md         # AI 使用记录
├── WangChunYan_C6_拿来说明.md       # 借鉴来源（ATTRIBUTION）
├── WangChunYan_C6_AAR复盘.md        # AAR 反思
├── WangChunYan_C6_demo脚本.md       # demo 视频分镜脚本
└── app/                             # Web 应用源码
    ├── index.html
    ├── README.md                    # 安装/运行/使用说明
    └── js/
        ├── app.js                   # 界面交互逻辑（详细中文注释）
        ├── ai.js                    # AI 调用模块（DeepSeek/OpenAI 兼容）
        └── demo-data.js             # 演示模式本地生成器
```
