import { useState } from 'react'
import { Link } from 'react-router-dom'
import { testConnection } from '../services/aiService'
import { getApiConfig, providers, saveApiConfig } from '../utils/apiConfig'

const emptyConfig = { provider: 'openai', apiKey: '', baseUrl: '', model: '' }

// 判断当前值是用户填的，还是某个 provider 的默认值
const isProviderDefault = (value, defaults) => value === '' || defaults.includes(value)

const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

function FieldLabel({ children }) {
  return <label className="mb-1.5 block text-sm font-medium text-slate-700">{children}</label>
}

function SetupPage() {
  const [config, setConfig] = useState(() => getApiConfig() || emptyConfig)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)

  const isCustom = config.provider === 'custom'
  const providerMeta = providers.find((p) => p.value === config.provider)

  const updateField = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const handleProviderChange = (value) => {
    const next = providers.find((p) => p.value === value)
    setConfig((prev) => {
      const allDefaults = providers.map((p) => p.defaultBaseUrl)
      const allModels = providers.map((p) => p.defaultModel)
      return {
        ...prev,
        provider: value,
        baseUrl: isProviderDefault(prev.baseUrl, allDefaults) ? next.defaultBaseUrl : prev.baseUrl,
        model: isProviderDefault(prev.model, allModels) ? next.defaultModel : prev.model,
      }
    })
    setSaved(false)
  }

  const handleSave = () => {
    saveApiConfig(config)
    setSaved(true)
  }

  const handleTest = async () => {
    // 前置校验：不满足条件时绝不发送请求
    if (!config.apiKey.trim()) {
      setTestResult({ type: 'error', message: '请先填写 API Key。' })
      return
    }
    if (!config.model.trim()) {
      setTestResult({ type: 'error', message: '请先填写模型名称（Model）。' })
      return
    }
    if (!config.baseUrl.trim()) {
      setTestResult({ type: 'error', message: '请先填写 Base URL。' })
      return
    }
    if (isCustom) {
      try {
        new URL(config.baseUrl)
      } catch {
        setTestResult({ type: 'error', message: 'Base URL 不是有效的地址，请检查后重试。' })
        return
      }
    }

    setTesting(true)
    setTestResult(null)
    try {
      // 真实请求，成功与否完全取决于接口返回
      const result = await testConnection(config)
      if (result.ok) {
        setTestResult({ type: 'success', message: `连接成功（模型实际回复：${result.reply}）` })
      } else {
        setTestResult({
          type: 'error',
          message: `已连通，但返回内容与预期不符。模型回复：${result.reply}`,
        })
      }
    } catch (error) {
      setTestResult({ type: 'error', message: error?.message || '连接失败，请检查配置。' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Link to="/" className="text-sm text-slate-500 transition-colors hover:text-blue-600">
        ← 返回首页
      </Link>

      <h1 className="mt-6 text-2xl font-bold text-slate-900">AI 配置</h1>
      <p className="mt-2 text-sm text-slate-500">配置用于简历分析的 AI 接口</p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="space-y-6">
          <div>
            <FieldLabel>AI 提供商</FieldLabel>
            <select
              value={config.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className={fieldClass}
            >
              {providers.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>API Key</FieldLabel>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={(e) => updateField('apiKey', e.target.value)}
                placeholder="sk-..."
                autoComplete="off"
                className={`${fieldClass} pr-16`}
              />
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-slate-400 transition-colors hover:text-slate-600"
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
          </div>

          {isCustom && (
            <div>
              <FieldLabel>Base URL</FieldLabel>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => updateField('baseUrl', e.target.value)}
                placeholder="https://your-endpoint.com/v1"
                className={fieldClass}
              />
            </div>
          )}

          <div>
            <FieldLabel>Model</FieldLabel>
            <input
              type="text"
              value={config.model}
              onChange={(e) => updateField('model', e.target.value)}
              placeholder={providerMeta?.defaultModel || '例如 gpt-4o'}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
          🔒 API Key 仅保存在当前浏览器中，不会上传到本项目服务器。
          <span className="mt-1 block text-blue-600/80">
            请求时由浏览器直接发往你选择的 AI 服务商，不经过任何中间服务器。
          </span>
        </div>

        {testing && (
          <p className="mt-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
            ⏳ 正在请求 AI 接口，请稍候…
          </p>
        )}

        {!testing && testResult && (
          <p
            className={`mt-4 rounded-lg px-4 py-3 text-sm ${
              testResult.type === 'error'
                ? 'bg-red-50 text-red-600'
                : testResult.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            {testResult.message}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-200 transition-colors hover:bg-blue-700"
          >
            保存配置
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
          >
            {testing ? '测试中…' : '测试连接'}
          </button>

          {saved && (
            <span className="text-sm font-medium text-green-600">
              ✓ 已保存 ·{' '}
              <Link to="/analyze" className="text-blue-600 hover:underline">
                去分析简历
              </Link>
            </span>
          )}
        </div>
      </div>
    </main>
  )
}

export default SetupPage
