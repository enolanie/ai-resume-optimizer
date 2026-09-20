import { Link } from 'react-router-dom'

const features = [
  {
    icon: '🔍',
    title: 'JD 核心要求解析',
    description: '从岗位描述中提取核心技能、经验要求和软能力，把模糊的 JD 变成清晰的能力清单。',
  },
  {
    icon: '📊',
    title: '简历匹配度分析',
    description: '逐条比对简历与岗位要求，明确指出哪些能力已经匹配，哪些还有缺口。',
  },
  {
    icon: '✨',
    title: '简历内容优化',
    description: '用 STAR 结构重写项目经历，让每一条描述都指向岗位真正关心的能力。',
  },
]

function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-24">
      <section className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
          🚀 AI 驱动 · 岗位定向优化
        </span>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          AI 简历优化助手
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-500">
          让简历真正匹配岗位要求
        </p>

        <div className="mt-9">
          <Link
            to="/analyze"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-base font-medium text-white shadow-lg shadow-blue-200 transition-colors hover:bg-blue-700"
          >
            开始使用
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="mt-20 grid gap-6 sm:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
              {feature.icon}
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-800">{feature.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{feature.description}</p>
          </div>
        ))}
      </section>
    </main>
  )
}

export default HomePage
