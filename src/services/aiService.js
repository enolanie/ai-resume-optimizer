// AI 调用服务层。所有对第三方 AI 接口的请求都集中在这里。
// API Key 只从调用方传入，不做任何持久化、打印或日志记录。

const REQUEST_TIMEOUT_MS = 60000

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// 错误信息会展示到 UI，必须确保不包含 Key 或任何疑似密钥的长串
const sanitize = (text, apiKey) => {
  let out = String(text ?? '')
  if (apiKey) out = out.split(apiKey).join('[已隐藏]')
  out = out.replace(/\b(sk-[A-Za-z0-9_-]{8,}|sk-ant-[A-Za-z0-9_-]{8,})\b/g, '[已隐藏]')
  return out.slice(0, 300)
}

const safeJson = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// 浏览器跨域请求需要服务端显式放行，用于把 CORS 失败与接口本身报错区分开
const isBrowser = typeof window !== 'undefined'
const requestOrigin = () => (isBrowser ? window.location.origin : '')

const buildHeaders = (provider, apiKey) => {
  if (provider === 'anthropic') {
    return {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Anthropic 允许浏览器直连所必需的头部
      'anthropic-dangerous-direct-browser-access': 'true',
    }
  }
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${apiKey}`,
  }
}

const DEFAULT_MAX_TOKENS = 2048

const buildBody = (provider, model, messages, maxTokens) => {
  if (provider === 'anthropic') {
    return {
      model,
      max_tokens: maxTokens,
      messages: messages.map((m) => ({ role: m.role, content: String(m.content) })),
    }
  }
  // 刻意不发 temperature：部分较新的 OpenAI 兼容模型只接受默认值，传了会 400
  return { model, messages, max_tokens: maxTokens }
}

// 读取结束原因。OpenAI 兼容用 choices[0].finish_reason，
// Anthropic 用顶层 stop_reason（触发长度上限时的取值是 max_tokens）。
const readFinishReason = (provider, data) => {
  const raw = provider === 'anthropic' ? data?.stop_reason : data?.choices?.[0]?.finish_reason
  return typeof raw === 'string' ? raw : null
}

const LENGTH_REASONS = ['length', 'max_tokens']

const extractContent = (provider, data) => {
  if (provider === 'anthropic') {
    const blocks = Array.isArray(data?.content) ? data.content : []
    return blocks
      .filter((b) => b?.type === 'text')
      .map((b) => b.text)
      .join('')
  }
  const content = data?.choices?.[0]?.message?.content
  return typeof content === 'string' ? content : ''
}

/**
 * 调用 AI 接口，返回纯文本。
 * @param {{provider: string, apiKey: string, baseUrl: string, model: string, messages: Array}} config
 */
export async function callAI({ provider, apiKey, baseUrl, model, messages, maxTokens }) {
  if (!apiKey || !apiKey.trim()) throw new ApiError('缺少 API Key。', null)
  if (!model || !model.trim()) throw new ApiError('缺少模型名称（Model）。', null)
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ApiError('请求内容为空。', null)
  }

  const root = String(baseUrl || '').trim().replace(/\/+$/, '')
  if (!root) throw new ApiError('缺少 Base URL，请在 AI 配置中填写。', null)

  const endpoint = provider === 'anthropic' ? `${root}/messages` : `${root}/chat/completions`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: buildHeaders(provider, apiKey),
      body: JSON.stringify(buildBody(provider, model, messages, maxTokens ?? DEFAULT_MAX_TOKENS)),
      signal: controller.signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new ApiError(`请求超时（${REQUEST_TIMEOUT_MS / 1000} 秒），请检查网络或接口地址。`, null)
    }
    throw new ApiError(
      `请求未能送达：${sanitize(err?.message, apiKey)}。可能原因：网络不可达、接口地址错误，或浏览器跨域(CORS)被拦截。`,
      null,
    )
  } finally {
    clearTimeout(timer)
  }

  const raw = await response.text()

  if (!response.ok) {
    const data = safeJson(raw)
    const detail = data?.error?.message || raw || '接口未返回错误详情'
    const requestId = data?.request_id ? `（request_id: ${data.request_id}）` : ''
    throw new ApiError(
      `接口返回 ${response.status}：${sanitize(detail, apiKey)}${requestId}`,
      response.status,
    )
  }

  const data = safeJson(raw)
  if (data === null) {
    throw new ApiError('接口返回的内容不是合法 JSON，无法解析。', response.status)
  }

  const content = extractContent(provider, data).trim()
  if (!content) {
    // 区分"被长度上限切断"和"其他原因导致的空内容"，避免误导
    const finishReason = readFinishReason(provider, data)
    if (finishReason && LENGTH_REASONS.includes(finishReason)) {
      throw new ApiError(
        '模型输出已达到长度上限，未能生成完整结果。请重试；若仍失败，请缩短 JD 或简历内容后重试。',
        response.status,
      )
    }
    throw new ApiError('接口返回了空内容。', response.status)
  }

  return content
}

export const TEST_PROMPT = '请只回复：连接成功'
export const TEST_EXPECTED = '连接成功'

/** 测试连接：发送一个固定短请求，校验返回内容 */
export async function testConnection(config) {
  const reply = await callAI({ ...config, messages: [{ role: 'user', content: TEST_PROMPT }] })
  return { ok: reply.includes(TEST_EXPECTED), reply, origin: requestOrigin() }
}

export { ApiError }
