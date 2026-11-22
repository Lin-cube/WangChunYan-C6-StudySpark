/**
 * ============================================================
 * app.js —— 界面交互逻辑（应用主程序）
 * ============================================================
 * 【职责】把页面上的按钮、输入框和 ai.js / demo-data.js 串起来：
 *   输入文本 → 调用生成 → 渲染闪卡 / 自测题 / Markdown 导出
 * 【模块依赖】
 *   - window.StudySparkAI.generateStudySet()  生成学习集
 *   - window.StudySparkDemo.SAMPLE_TEXT       示例文本
 * ============================================================
 */

/* ---------- 1. 全局状态 ---------- */
const state = {
  result: null,      // 当前学习集 { cards, quiz, mode }
  quizAnswers: {},   // 自测题已作答记录 { 题目下标: 选项下标 }
  activeTab: "cards" // 当前选项卡：cards | quiz | export
};

/* ---------- 2. 小工具 ---------- */

/** 简易 toast 提示（底部浮层，2.4 秒后自动消失） */
function toast(msg, type = "info") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast show " + type; // type: info | success | error
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.remove("show"), 2400);
}

/** HTML 转义，防止用户文本里的 < > 破坏页面结构 */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** 更新顶部「模式徽章」：AI 模式 / 演示模式 */
function refreshModeChip() {
  const chip = document.getElementById("modeChip");
  if (window.StudySparkAI.hasAIKey()) {
    chip.textContent = "⚡ AI 模式";
    chip.className = "mode-chip ai";
  } else {
    chip.textContent = "🎈 演示模式";
    chip.className = "mode-chip demo";
  }
}

/* ---------- 3. 生成流程（核心链路：输入 → 处理 → 输出） ---------- */

async function handleGenerate() {
  const text = document.getElementById("inputText").value.trim();
  if (text.length < 20) {
    toast("内容太短啦，请至少输入 20 个字的学习材料", "error");
    return;
  }

  // 读取用户选择的生成参数
  const opts = {
    count: parseInt(document.getElementById("optCount").value, 10),
    difficulty: document.getElementById("optDifficulty").value,
    lang: document.getElementById("optLang").value
  };

  const btn = document.getElementById("btnGenerate");
  const resultPanel = document.getElementById("resultPanel");
  btn.disabled = true;
  btn.textContent = "⏳ 生成中…";
  resultPanel.classList.add("loading");

  try {
    // 调用生成（有 Key 走 AI，无 Key 走演示模式）
    const result = await window.StudySparkAI.generateStudySet(text, opts);
    state.result = result;
    state.quizAnswers = {};
    renderAll();
    toast(result.mode === "ai" ? "AI 生成完成！" : "演示模式生成完成（配置 API Key 可获得 AI 智能生成）", "success");
  } catch (err) {
    // AI 调用失败时自动降级到演示模式，保证「输入→输出」永远走得通
    console.error(err);
    const fallback = window.StudySparkDemo.demoGenerate(text, opts);
    state.result = { ...fallback, mode: "demo" };
    state.quizAnswers = {};
    renderAll();
    toast(`AI 调用失败（${err.message}），已自动切换演示模式`, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "⚡ 开始生成";
    resultPanel.classList.remove("loading");
  }
}

/* ---------- 4. 渲染：闪卡 ---------- */

function renderCards() {
  const box = document.getElementById("cardsWrap");
  const cards = state.result?.cards || [];
  if (cards.length === 0) {
    box.innerHTML = `<p class="empty-hint">本次没有生成闪卡，试试点击「生成自测题」。</p>`;
    return;
  }
  box.innerHTML = cards
    .map(
      (c, i) => `
      <div class="flashcard" data-idx="${i}" tabindex="0" role="button" aria-label="点击翻转第${i + 1}张卡片">
        <div class="flashcard-inner">
          <div class="flashcard-face flashcard-front">
            <span class="card-tag">${esc(c.tag)}</span>
            <p class="card-text">${esc(c.q)}</p>
            <span class="card-hint">点击查看答案</span>
          </div>
          <div class="flashcard-face flashcard-back">
            <span class="card-tag">答案</span>
            <p class="card-text answer">${esc(c.a)}</p>
            <span class="card-hint">点击返回题目</span>
          </div>
        </div>
      </div>`
    )
    .join("");

  // 给每张卡绑定翻转事件（点击 + 回车键，兼顾键盘用户）
  box.querySelectorAll(".flashcard").forEach(card => {
    const flip = () => card.classList.toggle("flipped");
    card.addEventListener("click", flip);
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
    });
  });
}

/* ---------- 5. 渲染：自测题 ---------- */

function renderQuiz() {
  const box = document.getElementById("quizWrap");
  const quiz = state.result?.quiz || [];
  if (quiz.length === 0) {
    box.innerHTML = `<p class="empty-hint">本次没有生成自测题，换一段材料试试。</p>`;
    return;
  }

  const answered = Object.keys(state.quizAnswers).length;
  const correct = quiz.filter((q, i) => state.quizAnswers[i] === q.answer).length;

  box.innerHTML = `
    <div class="quiz-score-bar">
      <span>已答 <b>${answered}</b> / ${quiz.length} 题</span>
      <span>答对 <b class="text-green-600">${correct}</b> 题</span>
      <button id="btnResetQuiz" class="btn-ghost">🔄 重新测验</button>
    </div>
    ${quiz
      .map((q, i) => {
        const picked = state.quizAnswers[i];
        const hasPicked = picked !== undefined;
        return `
        <div class="quiz-item">
          <p class="quiz-q"><b>Q${i + 1}.</b> ${esc(q.question)}</p>
          <div class="quiz-options">
            ${q.options
              .map((opt, j) => {
                let cls = "quiz-opt";
                if (hasPicked) {
                  if (j === q.answer) cls += " correct";        // 正确项始终标绿
                  else if (j === picked) cls += " wrong";        // 用户选错的标红
                }
                return `<button class="${cls}" data-q="${i}" data-o="${j}" ${hasPicked ? "disabled" : ""}>
                          <span class="opt-letter">${"ABCD"[j]}</span> ${esc(opt)}
                        </button>`;
              })
              .join("")}
          </div>
          ${hasPicked ? `<p class="quiz-explain">💡 ${esc(q.explain)}</p>` : ""}
        </div>`;
      })
      .join("")}
  `;

  // 点击选项 → 记录答案并重绘
  box.querySelectorAll(".quiz-opt").forEach(btn => {
    btn.addEventListener("click", () => {
      state.quizAnswers[btn.dataset.q] = parseInt(btn.dataset.o, 10);
      renderQuiz();
    });
  });
  // 重新测验按钮
  document.getElementById("btnResetQuiz")?.addEventListener("click", () => {
    state.quizAnswers = {};
    renderQuiz();
  });
}

/* ---------- 6. 渲染：Markdown 导出 ---------- */

/** 把学习集拼成一份 Markdown 文档字符串 */
function buildMarkdown() {
  const { cards = [], quiz = [] } = state.result || {};
  const dateStr = new Date().toLocaleString("zh-CN");
  const lines = [
    `# StudySpark 学习卡片集`,
    ``,
    `> 由 StudySpark · AI 学习卡片工坊 生成于 ${dateStr}`,
    `> 提交人：WangChunYan（2023105110151）`,
    ``,
    `## 一、闪卡（${cards.length} 张）`,
    ``
  ];
  cards.forEach((c, i) => {
    lines.push(`### 卡片 ${i + 1}｜${c.tag}`, `**Q：** ${c.q}`, `**A：** ${c.a}`, ``);
  });
  lines.push(`## 二、自测题（${quiz.length} 道）`, ``);
  quiz.forEach((q, i) => {
    lines.push(`### Q${i + 1}. ${q.question}`, ``);
    q.options.forEach((o, j) => lines.push(`- ${"ABCD"[j]}. ${o}${j === q.answer ? " ✅" : ""}`));
    lines.push(``, `> **解析：** ${q.explain}`, ``);
  });
  return lines.join("\n");
}

function renderExport() {
  const pre = document.getElementById("exportPreview");
  pre.textContent = state.result ? buildMarkdown() : "先在左侧输入内容并点击「开始生成」，这里会出现可下载的 Markdown。";
}

/* ---------- 7. 总渲染 + 选项卡切换 ---------- */

function renderAll() {
  renderCards();
  renderQuiz();
  renderExport();
  // 显示结果面板（生成前是隐藏的占位说明）
  document.getElementById("resultEmpty").classList.add("hidden");
  document.getElementById("resultContent").classList.remove("hidden");
  refreshModeChip();
}

function switchTab(name) {
  state.activeTab = name;
  ["cards", "quiz", "export"].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle("tab-active", t === name);
    document.getElementById(`panel-${t}`).classList.toggle("hidden", t !== name);
  });
}

/* ---------- 8. 设置弹窗（API Key 配置） ---------- */

function openSettings() {
  const cfg = window.StudySparkAI.getAIConfig();
  document.getElementById("setProvider").value = cfg.provider || "deepseek";
  document.getElementById("setBaseUrl").value = cfg.baseUrl || "";
  document.getElementById("setModel").value = cfg.model || "";
  document.getElementById("setApiKey").value = cfg.apiKey || "";
  document.getElementById("settingsModal").classList.remove("hidden");
}

function closeSettings() {
  document.getElementById("settingsModal").classList.add("hidden");
}

function saveSettings() {
  const cfg = {
    provider: document.getElementById("setProvider").value,
    baseUrl: document.getElementById("setBaseUrl").value.trim(),
    model: document.getElementById("setModel").value.trim(),
    apiKey: document.getElementById("setApiKey").value.trim()
  };
  if (cfg.apiKey && (!cfg.baseUrl || !cfg.model)) {
    toast("请同时填写接口地址和模型名称", "error");
    return;
  }
  window.StudySparkAI.saveAIConfig(cfg);
  refreshModeChip();
  closeSettings();
  toast(cfg.apiKey ? "已保存，切换为 AI 模式" : "已保存，当前为演示模式", "success");
}

/** 切换服务商时自动填入预设的地址和模型 */
function onProviderChange() {
  const p = document.getElementById("setProvider").value;
  const preset = window.StudySparkAI.AI_PRESETS[p];
  if (preset) {
    document.getElementById("setBaseUrl").value = preset.baseUrl;
    document.getElementById("setModel").value = preset.model;
  }
}

/* ---------- 9. 文件上传 / 示例文本 / 导出下载 ---------- */

function handleFileUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { toast("文件超过 2MB，请截取重点部分", "error"); return; }
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById("inputText").value = String(reader.result || "");
    toast(`已导入《${file.name}》`, "success");
  };
  reader.onerror = () => toast("文件读取失败", "error");
  reader.readAsText(file);
}

function fillSample() {
  document.getElementById("inputText").value = window.StudySparkDemo.SAMPLE_TEXT;
  toast("已填入示例材料，点击「开始生成」试试", "success");
}

function downloadMarkdown() {
  if (!state.result) { toast("请先生成学习集", "error"); return; }
  const blob = new Blob([buildMarkdown()], { type: "text/markdown;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "StudySpark_学习卡片集.md";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("已开始下载 Markdown", "success");
}

async function copyMarkdown() {
  if (!state.result) { toast("请先生成学习集", "error"); return; }
  try {
    await navigator.clipboard.writeText(buildMarkdown());
    toast("Markdown 已复制到剪贴板", "success");
  } catch (e) {
    toast("复制失败，请手动全选导出区文本", "error");
  }
}

/* ---------- 10. 初始化：绑定所有事件 ---------- */

document.addEventListener("DOMContentLoaded", () => {
  // 主流程按钮
  document.getElementById("btnGenerate").addEventListener("click", handleGenerate);
  // 选项卡
  document.getElementById("tab-cards").addEventListener("click", () => switchTab("cards"));
  document.getElementById("tab-quiz").addEventListener("click", () => switchTab("quiz"));
  document.getElementById("tab-export").addEventListener("click", () => switchTab("export"));
  // 输入辅助
  document.getElementById("btnSample").addEventListener("click", fillSample);
  document.getElementById("fileInput").addEventListener("change", handleFileUpload);
  // 导出
  document.getElementById("btnDownloadMd").addEventListener("click", downloadMarkdown);
  document.getElementById("btnCopyMd").addEventListener("click", copyMarkdown);
  // 设置
  document.getElementById("btnSettings").addEventListener("click", openSettings);
  document.getElementById("btnCloseSettings").addEventListener("click", closeSettings);
  document.getElementById("btnSaveSettings").addEventListener("click", saveSettings);
  document.getElementById("setProvider").addEventListener("change", onProviderChange);
  document.getElementById("btnClearKey").addEventListener("click", () => {
    document.getElementById("setApiKey").value = "";
    toast("已清空 Key（点击保存后生效）");
  });
  // 点击遮罩关闭弹窗
  document.getElementById("settingsModal").addEventListener("click", e => {
    if (e.target.id === "settingsModal") closeSettings();
  });

  // 初始状态
  refreshModeChip();
  switchTab("cards");
});
