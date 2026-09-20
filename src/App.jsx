function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center">
      <div className="text-center px-4">
        <div className="text-6xl mb-6">🤖</div>
        <h1 className="text-4xl font-bold text-slate-800 mb-4 tracking-tight">
          AI 简历优化助手
        </h1>
        <p className="text-lg text-slate-500 max-w-md mx-auto">
          让简历真正匹配岗位要求
        </p>
        <div className="mt-8 flex gap-3 justify-center text-sm text-slate-400">
          <span className="bg-white rounded-full px-4 py-2 shadow-sm border border-slate-100">
            ① JD 核心要求解析
          </span>
          <span className="bg-white rounded-full px-4 py-2 shadow-sm border border-slate-100">
            ② 匹配度分析
          </span>
          <span className="bg-white rounded-full px-4 py-2 shadow-sm border border-slate-100">
            ③ 简历 STAR 优化
          </span>
        </div>
        <button className="mt-10 px-8 py-3 bg-blue-600 text-white rounded-xl text-lg font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 cursor-pointer">
          开始使用
        </button>
      </div>
    </div>
  )
}

export default App
