import { useEffect, useRef, useState } from 'react'
import AnalysisProgress from '../components/analyze/AnalysisProgress'
import InputPanel from '../components/analyze/InputPanel'
import ResultsPanel from '../components/analyze/ResultsPanel'
import { analyzeResume } from '../services/analysisService'
import { getApiConfig, hasApiKey, jobTypes } from '../utils/apiConfig'

function AnalyzePage() {
  const [jobType, setJobType] = useState(jobTypes[0])
  const [jdContent, setJdContent] = useState('')
  const [resumeContent, setResumeContent] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [notice, setNotice] = useState(null)

  // 页面卸载后不再写入状态，避免 React 警告
  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  const handleAnalyze = async () => {
    if (!jdContent.trim() || !resumeContent.trim()) {
      setNotice({ type: 'error', message: '请先填写 JD 和简历内容。' })
      return
    }
    if (!hasApiKey()) {
      setNotice({ type: 'error', message: '尚未配置 API Key，请先前往 AI 配置页面。', link: true })
      return
    }

    const config = getApiConfig()
    setAnalyzing(true)
    setCurrentStep(0)
    setResult(null)
    setErrorMessage(null)
    setNotice(null)

    try {
      const data = await analyzeResume({
        jdContent,
        resumeContent,
        jobType,
        config,
        onProgress: (_key, index) => {
          if (aliveRef.current) setCurrentStep(index)
        },
      })
      if (!aliveRef.current) return
      setResult(data)
    } catch (error) {
      if (!aliveRef.current) return
      // 展示真实失败原因，不掩盖错误；用户输入保持原样，可直接重试
      setErrorMessage(error?.message || '分析失败，请稍后重试。')
    } finally {
      if (aliveRef.current) setAnalyzing(false)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">简历匹配分析</h1>
      <p className="mt-2 text-sm text-slate-500">
        填写岗位 JD 和你的简历，AI 将给出匹配分析与优化建议
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <InputPanel
          jobType={jobType}
          setJobType={setJobType}
          jdContent={jdContent}
          setJdContent={setJdContent}
          resumeContent={resumeContent}
          setResumeContent={setResumeContent}
          analyzing={analyzing}
          onAnalyze={handleAnalyze}
          notice={notice}
        />

        <div>
          {analyzing && <AnalysisProgress currentStep={currentStep} />}
          {!analyzing && (
            <ResultsPanel result={result} error={errorMessage} onRetry={handleAnalyze} />
          )}
        </div>
      </div>
    </main>
  )
}

export default AnalyzePage
