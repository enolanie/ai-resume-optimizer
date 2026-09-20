// 三步分析链路的 Prompt 模板。与流程编排分离，方便单独调整措辞。

const JSON_ONLY = '只返回 JSON。不要使用 Markdown 代码块，不要输出任何解释性文字或前后缀。'

const block = (label, content) => `【${label}】\n${content}`

/** Step 1：解析 JD 需求 */
export const buildJdPrompt = ({ jdContent, jobType }) => [
  {
    role: 'system',
    content:
      '你是一名资深招聘顾问，擅长把岗位描述拆解成结构化的能力要求。你只依据用户提供的 JD 内容分析，不补充、不推测、不编造 JD 中未出现的要求。',
  },
  {
    role: 'user',
    content: [
      block('岗位类型', jobType),
      block('岗位 JD', jdContent),
      `请把上面的 JD 拆解成结构化要求，${JSON_ONLY}`,
      `输出格式：
{
  "job_title": "岗位名称",
  "skills": ["具体技能、工具、专业能力"],
  "experience_requirements": ["经验、学历、年限等要求"],
  "soft_skills": ["沟通、协作、推动力等软能力"],
  "bonus": ["加分项"]
}`,
      `划分标准：
- skills：具体技能、工具、专业能力
- experience_requirements：经验、学历、年限等硬性要求
- soft_skills：沟通、协作、推动等软能力
- bonus：加分项

若某一类在 JD 中确实没有提及，返回空数组 []，不要为了填满而编造。
数组中的每一项都是一句简短的字符串。${JSON_ONLY}`,
    ].join('\n\n'),
  },
]

/** Step 2：简历与 JD 匹配分析 */
export const buildMatchPrompt = ({ jdAnalysis, resumeContent, jobType }) => [
  {
    role: 'system',
    content:
      '你是一名严谨的简历评估专家。你只依据用户实际提供的简历内容判断，绝不虚构、不脑补、不假设用户具备简历中没有写明的经历或能力。',
  },
  {
    role: 'user',
    content: [
      block('岗位类型', jobType),
      // 紧凑传入，避免模型模仿缩进格式把输出撑长
      block('JD 结构化要求', JSON.stringify(jdAnalysis)),
      block('候选人简历原文', resumeContent),
      `请把 JD 的每一条要求与简历逐条比对，${JSON_ONLY}`,
      `输出格式（紧凑 JSON，不要换行缩进，不要任何多余空格）：
{"matched":[{"requirement":"","evidence":"","status":"matched"}],"partial":[{"requirement":"","evidence":"","status":"partial"}],"missing":[{"requirement":"","evidence":"","status":"missing"}],"gap_summary":""}`,
      `判定标准（必须严格遵守）：
- matched：简历中有明确、直接的证据
- partial：有相关经历，但证据不足或匹配不完整
- missing：JD 有要求，但简历中没有明确证据

【篇幅硬性限制 —— 必须严格遵守】
- matched 最多 8 项，partial 最多 8 项，missing 最多 8 项
- requirement 必须简洁，不超过约 15 个中文字符，直接概括要求，不要复述整段 JD 原文
- evidence 必须精炼，不超过约 50 个中文字符，用 1-2 句概括简历中已有的事实，只引用或概括，不要照抄整段
- 绝对不要重复整段 JD 或整段简历原文
- gap_summary 用 3-5 句话概括，总长不超过约 200 个中文字符
- 严格按上述上限裁剪，优先保留最关键、最有代表性的条目

【严禁凑数】
- 如果符合某一类的条目少于上限，就输出实际数量，不要为了凑满 8 项而编造
- 宁可少输出几条，也绝不能生成简历中不存在的能力或经历

【反幻觉规则 —— 不可违反】
- 不得编造用户简历中没有的经历、数字、公司、时间、技能
- evidence 必须来自简历中真实存在的表述，不要改写、不要润色成更强的说法
- 绝对不要把"可能具备"写成"已经具备"
- 简历中没有的信息，一律归为 missing，不要替候选人假设
- matched 与 partial 的 evidence 不能为空；missing 的 evidence 留空字符串`,
    ].join('\n\n'),
  },
]

/** Step 3：简历优化生成 */
export const buildOptimizePrompt = ({ resumeContent, jdAnalysis, matchAnalysis, jobType }) => [
  {
    role: 'system',
    content:
      '你是一名专业的简历优化师。你的职责是让候选人已有的真实经历表达得更清晰、更贴合岗位，而不是替他创造经历。你绝不虚构任何事实。',
  },
  {
    role: 'user',
    content: [
      block('岗位类型', jobType),
      block('JD 结构化要求', JSON.stringify(jdAnalysis, null, 2)),
      block('匹配分析结果', JSON.stringify(matchAnalysis, null, 2)),
      block('简历原文', resumeContent),
      `请优化这份简历，${JSON_ONLY}`,
      `输出格式（紧凑 JSON，不要换行缩进，不要 Markdown 代码围栏）：
{"suggestions":[{"section":"","original":"","optimized":"","reason":""}],"optimized_resume":""}`,
      `【输出纪律 —— 必须严格遵守】
- 不要输出任何思考过程、分析过程、推理过程或自我检查
- 不要输出任何解释性文字、前言、后记、总结
- 不要使用 Markdown 代码围栏
- 最终只返回符合上述 schema 的 JSON，内容以外一个字符都不要多

【篇幅限制】
- suggestions 最多 8 条，只列最关键、最有代表性的改动
- 每条 reason 用 1-2 句话说明，不要展开论述
- original 只引用必要的原文片段，不要整段照抄
- optimized_resume 必须保留完整简历结构（教育、工作、项目等各板块齐全），但表达要精炼，不要注水

【必须遵守的硬性规则】
1. 绝对不得虚构：不得添加用户没有提供的经历、技能、数据、公司、项目、成果、时间。
2. 允许的改动只有：优化表达、调整结构、强化与 JD 已有匹配点、把模糊描述改得更具体、使用 STAR 表达方式、调整关键词出现位置。
3. 若原简历缺少某项证据，绝对不要编造。改为在 suggestions 中提示用户应补充什么真实信息。
4. 严禁凭空生成任何数字（如"提升 30%""服务 10 万用户"）。只有原文已有的数字才可以保留和重组。
5. optimized_resume 必须是完整简历全文，而不是只输出修改片段。
6. 必须原样保留用户真实的教育经历、公司名称、项目名称、时间等信息。
7. original 字段必须是简历中真实存在的原文，便于用户对照。
8. 不得把 JD 中的要求改写成用户已经具备的能力——JD 有要求但简历无证据的，只能出现在 suggestions 的补充建议中。`,
    ].join('\n\n'),
  },
]
