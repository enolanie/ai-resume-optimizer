import { useState } from 'react'
import ResultSection from './ResultSection'

const Tags = ({ items, tone }) => {
  if (!items?.length) return <p className="text-sm text-slate-400">无</p>
  const toneClass =
    tone === 'bonus'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-slate-200 bg-white text-slate-700'
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

const MatchList = ({ items, tone, emptyText }) => {
  if (!items?.length) return <p className="text-sm text-slate-400">{emptyText}</p>
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item.requirement}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-start gap-2">
            <span className={`mt-0.5 shrink-0 text-xs font-semibold ${tone.text}`}>{tone.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{item.requirement}</p>
              {item.evidence ? (
                <p className="mt-1 text-xs leading-relaxed text-slate-500">依据：{item.evidence}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">简历中未见明确依据</p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

const STATUS = {
  matched: { icon: '✅', text: 'text-green-600' },
  partial: { icon: '🟡', text: 'text-amber-600' },
  missing: { icon: '❌', text: 'text-red-500' },
}

// 数组所属类别即状态，避免依赖模型回填的 status 字段
const MatchBlock = ({ kind, items, title, count, emptyText, children }) => (
  <ResultSection icon={STATUS[kind].icon} title={title} count={count}>
    <MatchList items={items} tone={STATUS[kind]} emptyText={emptyText} />
    {children}
  </ResultSection>
)

// 复制失败兜底：非 HTTPS / localhost 环境下 navigator.clipboard 不可用
const copyText = async (text) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 落到下面的兜底方案
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

function ResultsPanel({ result, error, onRetry }) {
  const [copied, setCopied] = useState(false)

  // 错误状态：保留用户输入，提供重新分析入口
  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">📊 分析结果</h2>
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <span aria-hidden="true">⚠️</span>分析失败
          </p>
          <p className="mt-2 text-sm leading-relaxed break-words text-red-600">{error}</p>
        </div>
        <p className="mt-4 text-xs text-slate-400">你的 JD 和简历内容已保留，修改后可直接重新分析。</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-200 transition-colors hover:bg-blue-700"
        >
          🔄 重新分析
        </button>
      </section>
    )
  }

  if (!result) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">📊 分析结果</h2>
        <div className="mt-4 space-y-4">
          {[
            ['🔍', 'JD 核心要求'],
            ['✅', '匹配情况'],
            ['⚠️', '主要缺口'],
            ['📌', '优化建议'],
            ['✨', '优化后的简历'],
          ].map(([icon, title], index) => (
            <div
              key={title}
              className={`rounded-xl border p-4 ${
                index === 4 ? 'border-blue-200 bg-blue-50/60' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span aria-hidden="true">{icon}</span>
                {title}
              </h3>
            </div>
          ))}
        </div>
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
          填写 JD 和简历后，点击开始分析
        </p>
      </section>
    )
  }

  const { jdAnalysis, matchAnalysis, optimization } = result

  const handleCopy = async () => {
    const ok = await copyText(optimization.optimized_resume)
    setCopied(ok)
    if (ok) setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800">
        📊 分析结果
        {jdAnalysis.job_title && (
          <span className="ml-2 text-sm font-normal text-slate-500">{jdAnalysis.job_title}</span>
        )}
      </h2>

      <div className="mt-4 space-y-4">
        <ResultSection icon="🔍" title="JD 核心要求">
          <div className="space-y-3">
            <Tags items={jdAnalysis.skills} />
            {jdAnalysis.experience_requirements.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">经验 / 学历要求</p>
                <Tags items={jdAnalysis.experience_requirements} />
              </div>
            )}
            {jdAnalysis.soft_skills.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">软能力</p>
                <Tags items={jdAnalysis.soft_skills} />
              </div>
            )}
            {jdAnalysis.bonus.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">加分项</p>
                <Tags items={jdAnalysis.bonus} tone="bonus" />
              </div>
            )}
          </div>
        </ResultSection>

        <MatchBlock
          kind="matched"
          title="匹配情况"
          count={matchAnalysis.matched.length}
          items={matchAnalysis.matched}
          emptyText="未识别到明确匹配的能力"
        />

        <MatchBlock
          kind="partial"
          title="部分匹配"
          count={matchAnalysis.partial.length}
          items={matchAnalysis.partial}
          emptyText="没有部分匹配项"
        />

        <MatchBlock
          kind="missing"
          title="主要缺口"
          count={matchAnalysis.missing.length}
          items={matchAnalysis.missing}
          emptyText="未发现明显缺口"
        >
          {matchAnalysis.gap_summary && (
            <p className="mt-3 rounded-lg bg-white p-3 text-xs leading-relaxed text-slate-600">
              {matchAnalysis.gap_summary}
            </p>
          )}
        </MatchBlock>

        <ResultSection icon="📌" title="优化建议" count={optimization.suggestions.length}>
          {optimization.suggestions.length === 0 ? (
            <p className="text-sm text-slate-400">本次没有生成具体修改建议</p>
          ) : (
            <ul className="space-y-3">
              {optimization.suggestions.map((s, index) => (
                <li
                  key={`${s.section}-${index}`}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  {s.section && (
                    <span className="mb-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {s.section}
                    </span>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-slate-400">原文</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{s.original || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-blue-600">优化后</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-700">{s.optimized}</p>
                    </div>
                  </div>
                  {s.reason && (
                    <p className="mt-2 border-t border-slate-100 pt-2 text-xs leading-relaxed text-slate-500">
                      原因：{s.reason}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ResultSection>

        <ResultSection icon="✨" title="优化后的简历" primary>
          <pre className="max-h-96 overflow-auto rounded-lg border border-blue-100 bg-white p-3 text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
            {optimization.optimized_resume}
          </pre>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              {copied ? '✓ 已复制' : '📋 一键复制'}
            </button>
            {copied && <span className="text-sm font-medium text-green-600">已复制</span>}
          </div>
        </ResultSection>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        AI 生成内容仅供参照。请务必核对每一项表述，确认与你的真实经历一致后再使用。
      </p>
    </section>
  )
}

export default ResultsPanel
