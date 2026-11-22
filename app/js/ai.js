/**
 * ============================================================
 * ai.js —— AI 调用模块
 * ============================================================
 * 【作用】把用户输入的学习文本发送给大语言模型（LLM），
 *         让 AI 生成结构化的「闪卡 + 自测题」学习集。
 * 【兼容接口】OpenAI 兼容的 /chat/completions 接口，
 *             默认使用 DeepSeek，也支持 OpenAI / Moonshot / 自定义中转。
 * 【安全设计】API Key 只保存在用户自己浏览器的 localStorage 里，
 *             不会写死在代码中、不会上传到任何服务器。
 * 【降级策略】没配 Key → 自动走 demo-data.js 的演示模式；
 *             调用失败 → 抛出友好中文错误，由 app.js 决定是否降级。
 * ============================================================
 */

/* ---------- 1. 配置存取（localStorage） ---------- */

const AI_CONFIG_KEY = "studyspark_ai_config"; // 本地存储的键名

/** 各服务商的预设（baseUrl 必须以 /v1 结尾，不含具体路径） */
const AI_PRESETS = {
  deepseek: { label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  openai: { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  moonshot: { label: "Moonshot", baseUrl: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k" },
  custom: { label: "自定义（OpenAI 兼容）", baseUrl: "", model: "" }
};

/** 读取配置，没有则返回默认值（DeepSeek 预设 + 空 Key） */
function getAIConfig() {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (raw) return { provider: "deepseek", apiKey: "", ...JSON.parse(raw) };
  } catch (e) {
    /* 本地数据损坏时忽略，走默认值 */
  }
  return { provider: "deepseek", baseUrl: AI_PRESETS.deepseek.baseUrl, model: AI_PRESETS.deepseek.model, apiKey: "" };
}

/** 保存配置到 localStorage */
function saveAIConfig(cfg) {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(cfg));
}

/** 是否已配置可用的 Key（决定走 AI 模式还是演示模式） */
function hasAIKey() {
  return Boolean(getAIConfig().apiKey && getAIConfig().apiKey.trim().length > 0);
}

/* ---------- 2. 提示词工程（Prompt） ---------- */

/**
 * 系统提示词：先定角色、再定输出格式，要求"只输出 JSON"
 * 这样前端可以直接 JSON.parse，不被多余文字干扰
 */
const SYSTEM_PROMPT = `你是一位专业的学习科学助教，擅长把学习材料拆解成高效的复习卡片和自测题。
你必须只输出一个合法的 JSON 对象，不要输出任何解释文字、markdown 代码块标记或多余内容。
JSON 结构必须严格符合：
{
  "cards": [ { "q": "问题（填空式，用＿＿＿＿表示空缺）", "a": "答案", "tag": "3~6字知识点标签" } ],
  "quiz":  [ { "question": "选择题题干", "options": ["选项1","选项2","选项3","选项4"], "answer": 0, "explain": "一句话解析" } ]
}
要求：
1. answer 是正确选项在 options 数组中的下标（0~3）；
2. options 必须恰好 4 项，干扰项要似是而非、有迷惑性；
3. cards 和 quiz 的内容不要重复；
4. 全部使用用户材料的语言（用户写中文就出中文题）。`;

/**
 * 构造用户提示词：把文本 + 生成参数拼进去
 * @param {string} text  学习材料（过长会截断，保护 token）
 * @param {object} opts  { count, difficulty, lang }
 */
function buildUserPrompt(text, opts) {
  const difficultyMap = {
    basic: "基础（侧重事实记忆）",
    advanced: "进阶（侧重理解与辨析）",
    challenge: "挑战（侧重应用与易混淆点）"
  };
  const clipped = text.length > 6000 ? text.slice(0, 6000) + "\n（材料过长已截断）" : text;
  return [
    `请根据以下学习材料生成学习集。`,
    `生成要求：`,
    `- 闪卡数量：${opts.count || 5} 张`,
    `- 难度：${difficultyMap[opts.difficulty] || difficultyMap.basic}`,
    `- 自测题数量：${Math.max(2, Math.floor((opts.count || 5) / 2))} 道`,
    ``,
    `学习材料：`,
    `<<<`,
    clipped,
    `>>>`
  ].join("\n");
}

/* ---------- 3. 调用大模型 ---------- */

/**
 * 发起一次 chat completions 请求
 * @returns {Promise<string>} 模型返回的原始文本
 */
async function callLLM(systemPrompt, userPrompt) {
  const cfg = getAIConfig();
  if (!cfg.apiKey) throw new Error("尚未配置 API Key");

  // 拼出接口地址，例如 https://api.deepseek.com/v1/chat/completions
  const url = cfg.baseUrl.replace(/\/+$/, "") + "/chat/completions";

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}` // Key 只在用户浏览器发出的这一次请求里使用
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.4, // 偏低的温度 → 输出更稳定、更贴合材料
      response_format: { type: "json_object" } // DeepSeek/OpenAI 支持：强制 JSON 输出
    })
  });

  // 把常见错误翻译成用户能看懂的中文提示
  if (resp.status === 401) throw new Error("API Key 无效或已过期，请在「设置」中检查");
  if (resp.status === 429) throw new Error("请求太频繁或额度不足，请稍后再试");
  if (!resp.ok) throw new Error(`AI 服务返回错误（HTTP ${resp.status}）`);

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 返回内容为空");
  return content;
}

/* ---------- 4. 结果解析与校验 ---------- */

/**
 * 把模型返回的文本解析成标准学习集对象
 * 会自动剥掉 ```json 代码块包裹、补齐缺失字段
 */
function parseStudySet(raw) {
  let text = String(raw).trim();
  // 去掉可能存在的 ```json ... ``` 包裹
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");

  let obj;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    throw new Error("AI 返回的不是合法 JSON，请重试一次");
  }

  const cards = Array.isArray(obj.cards) ? obj.cards : [];
  const quiz = Array.isArray(obj.quiz) ? obj.quiz : [];

  // 校验：至少要有 1 张卡或 1 道题，否则视为无效结果
  if (cards.length === 0 && quiz.length === 0) throw new Error("AI 生成结果为空，请重试");

  // 规范化：保证每个字段类型正确（防止模型偶发输出错位）
  return {
    cards: cards
      .filter(c => c && (c.q || c.question))
      .map(c => ({ q: c.q || c.question || "", a: c.a || c.answer || "", tag: c.tag || "知识点" })),
    quiz: quiz
      .filter(q => q && q.question && Array.isArray(q.options))
      .map(q => ({
        question: q.question,
        options: q.options.slice(0, 4).map(String),
        answer: Math.min(Math.max(parseInt(q.answer, 10) || 0, 0), 3), // 夹到 0~3
        explain: q.explain || ""
      }))
  };
}

/* ---------- 5. 对外唯一入口 ---------- */

/**
 * 生成学习集（app.js 只调用这一个函数）
 * - 有 Key：调用 AI 生成（🔵 进阶 AI 集成）
 * - 无 Key：自动走演示模式（保证核心流程永远可用）
 * @returns {Promise<{cards, quiz, mode: "ai"|"demo"}>}
 */
async function generateStudySet(text, opts) {
  if (!hasAIKey()) {
    // —— 演示模式：本地规则生成 ——
    const result = window.StudySparkDemo.demoGenerate(text, opts);
    return { ...result, mode: "demo" };
  }

  // —— AI 模式：调用大模型 ——
  const raw = await callLLM(SYSTEM_PROMPT, buildUserPrompt(text, opts));
  const result = parseStudySet(raw);
  return { ...result, mode: "ai" };
}

/* ---------- 6. 导出 ---------- */
window.StudySparkAI = {
  getAIConfig,
  saveAIConfig,
  hasAIKey,
  generateStudySet,
  AI_PRESETS
};
