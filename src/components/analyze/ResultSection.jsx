// 结果区的通用卡片容器，被 ResultsPanel 复用。
function ResultSection({ icon, title, count, primary = false, children }) {
  return (
    <section
      className={`rounded-xl border p-4 ${
        primary ? 'border-blue-200 bg-blue-50/60' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span aria-hidden="true">{icon}</span>
        {title}
        {typeof count === 'number' && (
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
            {count}
          </span>
        )}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  )
}

export default ResultSection
