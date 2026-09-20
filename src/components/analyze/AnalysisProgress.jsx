import { ANALYSIS_STEPS } from '../../services/analysisService'

// 展示三步串行分析的实时进度
function AnalysisProgress({ currentStep }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-600" />
        正在分析中
      </div>

      <ol className="mt-4 space-y-3">
        {ANALYSIS_STEPS.map((step, index) => {
          const done = index < currentStep
          const active = index === currentStep
          return (
            <li key={step.key} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? 'bg-blue-600 text-white'
                    : active
                      ? 'bg-white text-blue-600 ring-2 ring-blue-400'
                      : 'bg-slate-200 text-slate-500'
                }`}
              >
                {done ? '✓' : index + 1}
              </span>
              <span
                className={
                  done ? 'text-slate-500' : active ? 'font-medium text-blue-700' : 'text-slate-400'
                }
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>

      <p className="mt-4 text-xs text-blue-600/80">
        三步为串行调用，每步约需数秒，请勿关闭页面。
      </p>
    </div>
  )
}

export default AnalysisProgress
