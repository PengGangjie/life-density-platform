/* Leon 生命之轮（Wheel of Life）
 * 真源：https://docs.qq.com/sheet/DQkZ1RERNbEZOdmd0?tab=000001
 * 说明字段按表中 L 列原文收录。
 */
window.WHEEL_OF_LIFE = {
  version: 1,
  updated: "2026-08-19",
  source: {
    title: "Wheel of Life by Leon",
    sheet: "https://docs.qq.com/sheet/DQkZ1RERNbEZOdmd0?tab=000001",
    youtube: "https://www.youtube.com/watch?v=37FTO0aQycc",
    channel: "@爱旅行的四重奏",
    note: "表中引导：另存模版后填写分数；J 列为说明，可按视频引导改写。"
  },
  max: 10,
  pillars: [
    { id: "health", zh: "健康", en: "Health", color: "#0f766e", hint: "身体能不能撑住你要过的人生" },
    { id: "wealth", zh: "财富", en: "Wealth", color: "#d97706", hint: "现金、资产、时间，三样一起看" },
    { id: "happiness", zh: "幸福", en: "Happiness", color: "#9f1239", hint: "体验与关系，年老还翻得开的账本" }
  ],
  spokes: [
    {
      id: "physical", pillar: "health", zh: "身体健康", en: "Physical",
      related: ["rt-acquire"],
      desc: "衡量你的身体健康程度是否足以支撑你的人生目标。考虑疾病，健康指标（如体重、血压、心率）和饮食、运动、睡眠习惯等生活方式"
    },
    {
      id: "mental", pillar: "health", zh: "精神健康", en: "Mental",
      related: ["gd-inward", "rt-fortune"],
      desc: "衡量你的情绪是否稳定健康。对情绪的控制程度是否满意，考虑情绪状态、应对压力、注意力集中，思维模式等方面"
    },
    {
      id: "spiritual", pillar: "health", zh: "心灵健康", en: "Spiritual",
      related: ["rt-spirit", "rt-fortune", "rt-ledger"],
      desc: "衡量你的幸福感、满足感以及内心的平静状态。考虑自己的人生意义，自我意识和自我接纳程度，以及生活中的意义寻求、个人目标的设定以及实现这些目标的动力和方法"
    },
    {
      id: "money", pillar: "wealth", zh: "现金财富", en: "Money",
      related: ["gd-core", "gd-doubles", "gd-path"],
      desc: "衡量你的现金相对于你目前的欲望是否满足。考虑工作赚钱的能力或资产回报率，现金流的流向是否健康"
    },
    {
      id: "asset", pillar: "wealth", zh: "资产财富", en: "Asset",
      related: ["gd-asset", "gd-traps", "gd-not-same"],
      desc: "衡量你的资产财富，资产是产生现金流如固定收益债券，出租房；或者可能升值的资产如股票，加密货币，稀缺性的艺术品收藏。以及衡量你的资产配比状况"
    },
    {
      id: "time", pillar: "wealth", zh: "时间财富", en: "Time",
      related: ["rt-acquire", "rt-option", "gd-mind"],
      desc: "衡量你的时间是否足以做你人生想做的事情，以及每天的时间分配是否可以自由支配"
    },
    {
      id: "experience", pillar: "happiness", zh: "人生体验", en: "Experience",
      related: ["rt-move", "rt-option", "rt-ledger"],
      desc: "衡量你的人生体验是否丰富并带来幸福感，考虑教育，职业，成长，旅行，艺术，精神，情感，创造等"
    },
    {
      id: "family", pillar: "happiness", zh: "家庭关系", en: "Family Relationship",
      related: ["iw-listen-4", "iw-empathy", "iw-listen-ask"],
      desc: "衡量你的家庭沟通质量，情感支持，相互尊重，冲突解决，相互依赖与独立，共同成长，共同价值观"
    },
    {
      id: "social", pillar: "happiness", zh: "社会关系", en: "Social Relationship",
      related: ["iw-core", "iw-inspire", "iw-negotiate"],
      desc: "衡量你的社会关系的质量与深度，考虑互动频率，价值观，归属感，多样性，深度等"
    }
  ],
  sample: {
    physical: 7, mental: 8, spiritual: 5,
    money: 9, asset: 6, time: 10,
    experience: 9, family: 7, social: 8
  }
};
