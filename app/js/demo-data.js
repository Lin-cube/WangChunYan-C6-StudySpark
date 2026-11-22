/**
 * ============================================================
 * demo-data.js —— 演示模式（离线）学习集生成器
 * ============================================================
 * 【作用】当用户还没有配置 AI API Key 时，用本地规则算法
 *         从文本里抽取关键词，生成「填空式闪卡」和「四选一自测题」，
 *         保证任何人都能不登录、不配 Key 就体验完整核心流程。
 * 【数据结构】所有生成结果统一为下面这个对象：
 *   {
 *     cards: [ { q: "问题", a: "答案", tag: "知识点" }, ... ],
 *     quiz:  [ { question: "题干", options: ["选项A", ...], answer: 0, explain: "解析" }, ... ]
 *   }
 *   其中 quiz.answer 是正确选项在 options 数组里的下标（0~3）。
 * ============================================================
 */

/* ---------- 1. 示例文本：点击「试试示例」按钮时自动填入 ---------- */
const SAMPLE_TEXT = `费曼学习法的核心是"以教代学"。它要求学习者把一个概念用最简单的语言讲给完全不懂的人听，讲不清楚的地方就是自己没学懂的地方。
费曼学习法有四个步骤：第一步是选择一个概念，把它写在纸的最上方；第二步是假装把它教给一个孩子，用最朴素的语言解释；第三步是回头查资料，把卡壳、含糊的地方重新弄懂；第四步是简化和类比，用一句话或一个比喻把概念说清楚。
研究表明，被动地重复阅读课本的留存率只有百分之十左右，而主动把知识讲给别人听、做输出练习，留存率可以提高到百分之七十以上。
很多人学习时喜欢"划重点"和"抄笔记"，这些都属于输入型努力。真正的掌握发生在输出的时候，也就是你能不看资料复述、能举例、能回答追问的时候。
间隔复习同样重要。人的遗忘曲线告诉我们，学完当天不复习，一周后只能记住两成左右；如果在学完后的第 1 天、第 3 天、第 7 天分别复习一次，记忆会大幅巩固。
把费曼学习法和间隔复习结合起来效果最好：每次复习时都尝试"讲一遍"，讲不顺的地方立刻回到原材料补齐，这样每一次输出都是一次精准的查漏补缺。`;

/* ---------- 2. 内置兜底学习集（文本太短时使用） ---------- */
const FALLBACK_SET = {
  cards: [
    { q: "费曼学习法的核心理念是＿＿＿＿。", a: "以教代学（把知识讲给别人听来检验学习）", tag: "费曼学习法" },
    { q: "费曼学习法的第二步是假装把概念教给一个＿＿＿＿。", a: "孩子（用最朴素的语言解释）", tag: "费曼学习法" },
    { q: "被动重复阅读课本的知识留存率大约只有＿＿＿＿。", a: "10%", tag: "学习效率" },
    { q: "主动输出练习（讲给别人听）的知识留存率可以达到＿＿＿＿。", a: "70% 以上", tag: "学习效率" },
    { q: "遗忘曲线告诉我们：学完当天不复习，一周后大约只能记住＿＿＿＿。", a: "两成左右（20%）", tag: "间隔复习" },
    { q: "推荐的间隔复习节奏是学完后的第 1 天、第 3 天、第＿＿＿＿天各复习一次。", a: "7", tag: "间隔复习" }
  ],
  quiz: [
    {
      question: "费曼学习法的核心是下列哪一项？",
      options: ["以教代学", "反复抄写", "题海战术", "死记硬背"],
      answer: 0,
      explain: "费曼学习法强调'以教代学'：讲不清楚的地方就是没学懂的地方。"
    },
    {
      question: "被动重复阅读课本的知识留存率大约是多少？",
      options: ["约 10%", "约 30%", "约 50%", "约 90%"],
      answer: 0,
      explain: "学习金字塔理论指出，单纯听讲/阅读的留存率很低，约 10%。"
    },
    {
      question: "下列哪种做法属于'输出型努力'？",
      options: ["不看资料复述概念", "在书上划重点", "抄写课堂笔记", "重复阅读课本"],
      answer: 0,
      explain: "划重点、抄笔记、重复阅读都属于输入；复述、举例、答疑才是输出。"
    },
    {
      question: "比较有效的间隔复习节奏是？",
      options: ["第 1、3、7 天各一次", "只在学完当天复习", "考前一晚突击", "每天连续复习十遍"],
      answer: 0,
      explain: "在遗忘发生的节点（1/3/7 天）复习，能用最少的次数换来最牢的记忆。"
    }
  ]
};

/* ---------- 3. 工具函数 ---------- */

/**
 * 把整段文本切成句子数组
 * 中文按 。！？；\n 切分，英文按 .!? 切分
 */
function splitSentences(text) {
  return text
    .split(/[。！？；\n.!?;]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 8); // 太短的句子没有出题价值，丢弃
}

/** 中文停用词：这些字/词开头或结尾的片段多半是语法碎块，不适合当答案 */
const STOP_EDGE = "的了是在有和与把被从对为以就都不也而其这那个你我他它们呢吗吧啊呀或并且如果因为所以之于等很太更最只还有会能要可已让给向但及其中及其可以进行通过";

/**
 * 判断一个关键词片段是否值得当答案
 * 要求：长度 2~6、首尾不是停用词、不是纯虚词
 */
function isGoodKeyword(word) {
  if (word.length < 2 || word.length > 6) return false;
  if (STOP_EDGE.includes(word[0]) || STOP_EDGE.includes(word[word.length - 1])) return false;
  // 整个词都在停用词表里（如 "如果" "并且"）也丢弃
  if ([...word].every(ch => STOP_EDGE.includes(ch))) return false;
  return true;
}

/**
 * 从一句话里抽取候选关键词
 * 思路：把连续汉字按「停用字」切开，得到完整的实词块
 *       （例如「用最朴素的语言解释」→「用最朴素」「语言解释」）
 *       再过滤掉太碎/太长的片段，按信息量打分排序
 */
function extractKeywords(sentence) {
  const sep = new Set([...STOP_EDGE]); // 停用字集合（同时充当切分符）

  // 1) 中文：逐字扫描连续汉字，遇到停用字就断开
  const fragments = [];
  for (const run of sentence.match(/[一-龥]+/g) || []) {
    let buf = "";
    for (const ch of run) {
      if (sep.has(ch)) {
        if (buf) fragments.push(buf); // 词块入池
        buf = "";
      } else {
        buf += ch;
      }
    }
    if (buf) fragments.push(buf);
  }

  // 2) 英文单词 / 数字（含 %），例如 "TCP" "10%"
  const enMatches = sentence.match(/[A-Za-z][A-Za-z0-9%-]{3,}/g) || [];

  // 3) 去重 + 质量过滤 + 打分排序（3~4 字实词优先）
  const candidates = [...new Set([...fragments, ...enMatches])].filter(isGoodKeyword);
  return candidates.sort((a, b) => {
    const score = w => (w.length >= 3 && w.length <= 4 ? 100 : 60) + w.length;
    return score(b) - score(a);
  });
}

/**
 * 乱序数组（Fisher-Yates 洗牌算法），返回新数组
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]; // 交换
  }
  return a;
}

/* ---------- 4. 演示模式主生成函数 ---------- */

/**
 * 演示模式生成学习集
 * @param {string} text  用户输入的原始文本
 * @param {object} opts  { count: 5|10|15, difficulty, lang }
 * @returns {{cards: Array, quiz: Array}}
 */
function demoGenerate(text, opts = {}) {
  const count = opts.count || 5; // 需要生成的闪卡数量

  const sentences = splitSentences(text || "");
  // 文本太短 → 直接返回内置兜底学习集（裁剪到需要的数量）
  if (sentences.length < 2) {
    return {
      cards: FALLBACK_SET.cards.slice(0, count),
      quiz: FALLBACK_SET.quiz.slice(0, Math.max(2, Math.floor(count / 2)))
    };
  }

  // 收集全文关键词池（做干扰项用）
  const pool = [...new Set(sentences.flatMap(extractKeywords))].filter(k => k.length >= 2);

  const cards = [];
  const quiz = [];
  const usedKeywords = new Set();
  const needQuiz = Math.max(2, Math.floor(count / 2));

  for (const sentence of sentences) {
    if (cards.length >= count && quiz.length >= needQuiz) break;

    const keywords = extractKeywords(sentence);
    if (keywords.length === 0) continue;

    // 优先选没用过的关键词当答案，避免题目重复
    const answer = keywords.find(k => !usedKeywords.has(k)) || keywords[0];
    usedKeywords.add(answer);

    // ---- 生成填空式闪卡：把句子里的关键词替换成 ＿＿＿＿ ----
    if (cards.length < count) {
      const hasBlank = sentence.includes(answer);
      const q = hasBlank
        ? sentence.replace(answer, "＿＿＿＿")
        : `请解释这句话中的「${answer}」：${sentence.slice(0, 30)}…`;
      cards.push({ q, a: answer, tag: answer.slice(0, 6) });
    }

    // ---- 生成四选一自测题：正确项 + 3 个长度相近的干扰项（更像真题） ----
    if (quiz.length < needQuiz) {
      // 干扰项优先选与答案长度相近的关键词，看起来更似是而非
      const similar = pool
        .filter(k => k !== answer && Math.abs(k.length - answer.length) <= 2)
        .slice(0, 6);
      const others = pool.filter(k => k !== answer && !similar.includes(k));
      const distractors = shuffle([...similar, ...others]).slice(0, 3);
      // 兜底：全文关键词不够 3 个时，用通用干扰词补足
      const generic = ["以上都不对", "尚未有定论", "与主题无关", "不重要"];
      while (distractors.length < 3) distractors.push(generic[distractors.length]);
      const options = shuffle([answer, ...distractors]);
      quiz.push({
        question: `「${sentence.replace(answer, "＿＿＿＿")}」中缺失的内容是？`,
        options,
        answer: options.indexOf(answer), // 记录正确项下标
        explain: `原文表述：${sentence}`
      });
    }
  }

  // 数量补齐：材料句子不够时，用内置学习集补足到用户要的数量
  if (cards.length < count) {
    for (const c of FALLBACK_SET.cards) {
      if (cards.length >= count) break;
      if (!cards.some(x => x.q === c.q)) cards.push(c);
    }
  }
  if (quiz.length < needQuiz) {
    for (const q of FALLBACK_SET.quiz) {
      if (quiz.length >= needQuiz) break;
      if (!quiz.some(x => x.question === q.question)) quiz.push(q);
    }
  }

  // 极端兜底：万一一张卡都没生成出来，返回内置学习集
  if (cards.length === 0) return FALLBACK_SET;
  return { cards, quiz };
}

/* ---------- 5. 导出给其他模块使用 ---------- */
window.StudySparkDemo = {
  SAMPLE_TEXT,
  FALLBACK_SET,
  demoGenerate
};
