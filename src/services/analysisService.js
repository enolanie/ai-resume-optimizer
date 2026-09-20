// 三步串行分析链路：JD 解析 → 匹配分析 → 简历优化。
// 上一步的输出是下一步的输入，保证整条链路的连贯性。

import { callAI } from './aiService'
import { buildJdPrompt, buildMatchPrompt, buildOptimizePrompt } from './prompts'
import {
  asString,
  asStringArray,
  extractJson,
  isNonEmptyString,
  isNullableArray,
  requireShape,
} from '../utils/json'

/**
 * 解析 AI 返回的 JSON 文本。支持：
 * 纯 JSON / ```json 围栏 / ``` 围栏 / 前后带少量说明文字。
 * 解析失败一律抛错，绝不伪造结果。
 * 纯字符串处理，无第三方依赖（实现见 utils/json.js）。
 */
export const parseAIJson = extractJson

export const ANALYSIS_STEPS = [
  { key: 'jd', label: '正在解析 JD…' },
  { key: 'match', label: '正在分析匹配度…' },
  { key: 'optimize', label: '正在生成优化简历…' },
]

// 模型对"空"的表示不统一（[] / null / 缺失 / 单数字符串），
// 这里统一归一化，避免因为一个 null 就浪费掉整次 API 调用。
const toArray = (value) => {
  if (Array.isArray(value)) return value
  if (value === null || value === undefined || value === '') return []
  return [value]
}

const normalizeJd = (data) => ({
  job_title: asString(data.job_title),
  skills: asStringArray(data.skills),
  experience_requirements: asStringArray(data.experience_requirements),
  soft_skills: asStringArray(data.soft_skills),
  bonus: asStringArray(data.bonus),
})

const normalizeMatchItem = (item) => ({
  requirement: asString(item?.requirement),
  evidence: asString(item?.evidence),
  status: asString(item?.status),
})

const normalizeMatch = (data) => ({
  matched: toArray(data.matched).map(normalizeMatchItem).filter((i) => i.requirement),
  partial: toArray(data.partial).map(normalizeMatchItem).filter((i) => i.requirement),
  missing: toArray(data.missing).map(normalizeMatchItem).filter((i) => i.requirement),
  gap_summary: asString(data.gap_summary),
})

const normalizeSuggestions = (data) =>
  toArray(data.suggestions)
    .map((s) => ({
      section: asString(s?.section),
      original: asString(s?.original),
      optimized: asString(s?.optimized),
      reason: asString(s?.reason),
    }))
    .filter((s) => s.optimized)

/**
 * 执行完整三步分析。
 * @param {object} params
 * @param {(stepKey: string, index: number) => void} params.onProgress 每步开始前回调
 */
export async function analyzeResume({ jdContent, resumeContent, jobType, config, onProgress }) {
  const notify = (index) => onProgress?.(ANALYSIS_STEPS[index].key, index)

  // 标注失败发生在哪一步，便于用户定位
  const stepCall = async (index, params) => {
    try {
      return await callAI({ ...config, ...params })
    } catch (err) {
      const wrapped = new Error(`Step ${index + 1}：${err?.message || '分析失败'}`)
      wrapped.step = index + 1
      throw wrapped
    }
  }

  // ---- Step 1：JD 需求解析 ----
  notify(0)
  const jdRaw = await stepCall(0, {
    messages: buildJdPrompt({ jdContent, jobType }),
  })
  const jdAnalysis = normalizeJd(
    requireShape(
      extractJson(jdRaw),
      {
        skills: isNullableArray,
        experience_requirements: isNullableArray,
        soft_skills: isNullableArray,
        bonus: isNullableArray,
      },
      'JD 解析',
    ),
  )

  // ---- Step 2：简历匹配分析 ----
  notify(1)
  const matchRaw = await stepCall(1, {
    messages: buildMatchPrompt({ jdAnalysis, resumeContent, jobType }),
    maxTokens: 5000,
  })
  const matchAnalysis = normalizeMatch(
    requireShape(
      extractJson(matchRaw),
      { matched: isNullableArray, partial: isNullableArray, missing: isNullableArray },
      '匹配分析',
    ),
  )

  // ---- Step 3：简历优化生成 ----
  notify(2)
  const optimizeRaw = await stepCall(2, {
    messages: buildOptimizePrompt({ resumeContent, jdAnalysis, matchAnalysis, jobType }),
    // 推理型模型会先消耗 reasoning token，4000 会在产出最终 content 前耗尽
    maxTokens: 8000,
  })
  const optimizeData = requireShape(
    extractJson(optimizeRaw),
    { suggestions: isNullableArray, optimized_resume: isNonEmptyString },
    '简历优化',
  )
  const optimization = {
    suggestions: normalizeSuggestions(optimizeData),
    optimized_resume: asString(optimizeData.optimized_resume),
  }

  return { jdAnalysis, matchAnalysis, optimization }
}
