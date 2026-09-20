// 模型返回的 JSON 经常被包在 ```json 围栏里，或前后带解释文字。
// 这里做容错提取，并给出可展示到 UI 的明确错误。

export class JsonParseError extends Error {
  constructor(message, raw) {
    super(message)
    this.name = 'JsonParseError'
    this.raw = raw
  }
}

const stripFence = (s) => {
  const fence = /```(?:json|JSON)?\s*([\s\S]*?)\s*```/.exec(s)
  return fence ? fence[1] : s
}

// 从第一个 { 或 [ 开始做括号配对，跳过字符串内部和转义字符。
// 返回 { complete: true, json } 或 { complete: false, partial, reason }。
// 关键：区分"没找到 JSON"和"JSON 被截断"——后者才是模型输出超长的典型症状。
const scanBalanced = (s) => {
  const start = s.search(/[[{]/)
  if (start === -1) return { complete: false, partial: '', reason: 'no-start' }

  const open = s[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < s.length; i += 1) {
    const ch = s[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === open) depth += 1
    else if (ch === close) {
      depth -= 1
      if (depth === 0) return { complete: true, json: s.slice(start, i + 1) }
    }
  }

  // 扫描到结尾仍未闭合 —— 输出被截断
  return {
    complete: false,
    partial: s.slice(start),
    reason: inString ? 'in-string' : 'unclosed',
  }
}

const preview = (raw, n = 200) => String(raw ?? '').slice(0, n)
const tail = (raw, n = 80) => String(raw ?? '').slice(-n)

const looksLikeJsonStart = (s) => /^\s*[[{]/.test(String(s ?? ''))

/** 从模型原始输出中提取 JSON 对象 */
export const extractJson = (raw) => {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new JsonParseError('模型没有返回任何内容。', raw)
  }

  const hadJsonStart = looksLikeJsonStart(raw)
  const text = stripFence(raw).trim()

  // 先尝试整体解析，失败再走括号配对
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {
    // 落到下面的配对逻辑
  }

  const scan = scanBalanced(text)

  if (scan.complete) {
    try {
      const parsed = JSON.parse(scan.json)
      if (parsed && typeof parsed === 'object') return parsed
      throw new Error('not an object')
    } catch {
      throw new JsonParseError(
        `模型返回的 JSON 格式有误，无法解析。内容开头：${preview(scan.json)}`,
        raw,
      )
    }
  }

  // 没有闭合的 JSON：区分"根本没输出 JSON"与"输出了但被截断"
  if (scan.reason === 'no-start') {
    if (hadJsonStart) {
      // 整体已以 { 或 [ 开头，却连括号都没扫描到 —— 同样是截断
      throw new JsonParseError(
        `模型输出疑似被截断，JSON 不完整。内容结尾：…${tail(raw)}`,
        raw,
      )
    }
    throw new JsonParseError(
      `模型没有返回 JSON（未找到 JSON 起始符）。原始内容开头：${preview(raw)}`,
      raw,
    )
  }

  throw new JsonParseError(
    `模型输出疑似被截断，JSON 不完整（${scan.reason === 'in-string' ? '字符串未闭合' : '括号未闭合'}）。` +
      `内容结尾：…${tail(scan.partial)}`,
    raw,
  )
}

export const asString = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

export const asStringArray = (value) =>
  Array.isArray(value) ? value.map(asString).filter(Boolean) : []

/** 校验顶层形状，形状不对时给出明确错误而不是让 UI 崩掉 */
export const requireShape = (data, checks, stepLabel) => {
  for (const [field, predicate] of Object.entries(checks)) {
    if (!predicate(data?.[field])) {
      throw new JsonParseError(
        `${stepLabel}返回的数据结构不符合预期（字段 ${field} 缺失或类型错误）。请重试，或更换模型。`,
        null,
      )
    }
  }
  return data
}

// 字段必须存在，但允许为 null —— 模型常用 null 表示"这一类没有内容"，
// 归一化阶段会把它变成空数组，不该因此判定为结构错误。
export const isNullableArray = (v) => Array.isArray(v) || v === null
export const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0
