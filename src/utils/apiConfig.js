// AI 配置的本地存取。Key 只存在浏览器本地，永远不会上传。
const STORAGE_KEY = 'apiConfig'

// baseUrl 约定：OpenAI-compatible 用 https://host/v1（请求 /v1/chat/completions）
// Anthropic 用主机名（请求 /v1/messages）
export const providers = [
  { value: 'openai', label: 'OpenAI', defaultBaseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' },
  { value: 'anthropic', label: 'Anthropic', defaultBaseUrl: 'https://api.anthropic.com', defaultModel: 'claude-sonnet-5' },
  { value: 'custom', label: 'Custom', defaultBaseUrl: '', defaultModel: '' },
]

// 目标岗位类型，用于 Prompt 上下文
export const jobTypes = [
  'AI Product Manager',
  'Product Manager',
  'Product Operations',
  'Other',
]

export const getApiConfig = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null
  } catch {
    return null
  }
}

export const saveApiConfig = (config) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

// 供依赖该配置的页面在挂载时同步读取
export const hasApiKey = () => Boolean(getApiConfig()?.apiKey?.trim())
