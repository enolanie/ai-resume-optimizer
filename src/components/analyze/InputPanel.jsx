import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { jobTypes } from '../../utils/apiConfig'

const DRAFT_KEY = 'resumeDraft'

const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

function InputPanel({ jobType, setJobType, jdContent, setJdContent, resumeContent, setResumeContent, analyzing, onAnalyze, notice }) {
  const [uploadNotice, setUploadNotice] = useState(null)
  const fileInputRef = useRef(null)

  // 草稿回填（PRD S4：草稿自动保存，防止误关闭丢失）
  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY))
      if (!draft) return
      if (draft.jobType) setJobType(draft.jobType)
      if (draft.jdContent) setJdContent(draft.jdContent)
      if (draft.resumeContent) setResumeContent(draft.resumeContent)
    } catch {
      // 草稿损坏时忽略，不影响页面使用
    }
    // 仅在挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const draft = { jobType, jdContent, resumeContent, savedAt: new Date().toISOString() }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [jobType, jdContent, resumeContent])

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.txt')) {
      setUploadNotice({ type: 'error', message: '目前仅支持 TXT 文件上传。' })
      event.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadNotice({ type: 'error', message: '文件过大，请上传 5MB 以内的 TXT 文件。' })
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setResumeContent(String(reader.result))
      setUploadNotice({ type: 'success', message: `已读取 ${file.name}` })
    }
    reader.onerror = () => {
      setUploadNotice({ type: 'error', message: '文件读取失败，请重试或改为直接粘贴文本。' })
    }
    reader.readAsText(file)
    // 允许重复选择同一个文件
    event.target.value = ''
  }

  const shown = notice || uploadNotice

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800">📄 岗位 JD</h2>
      <textarea
        value={jdContent}
        onChange={(e) => setJdContent(e.target.value)}
        rows={9}
        placeholder="粘贴目标岗位的职位描述…"
        className={`${fieldClass} mt-3 resize-y leading-relaxed`}
      />

      <h2 className="mt-6 text-base font-semibold text-slate-800">📝 我的简历</h2>
      <textarea
        value={resumeContent}
        onChange={(e) => setResumeContent(e.target.value)}
        rows={9}
        placeholder="粘贴简历文本，或上传 TXT 文件自动填入…"
        className={`${fieldClass} mt-3 resize-y leading-relaxed`}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,text/plain"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="mt-3 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        📁 上传 TXT 文件
      </button>

      <h2 className="mt-6 text-base font-semibold text-slate-800">🎯 岗位类型</h2>
      <select
        value={jobType}
        onChange={(e) => setJobType(e.target.value)}
        className={`${fieldClass} mt-3`}
      >
        {jobTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onAnalyze}
        disabled={analyzing}
        className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm shadow-blue-200 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {analyzing ? '分析中…' : '开始分析'}
      </button>

      {shown && (
        <p
          className={`mt-3 rounded-lg px-4 py-3 text-sm ${
            shown.type === 'error'
              ? 'bg-red-50 text-red-600'
              : shown.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-slate-100 text-slate-600'
          }`}
        >
          {shown.message}{' '}
          {shown.link && (
            <Link to="/setup" className="font-medium text-blue-600 hover:underline">
              前往配置
            </Link>
          )}
        </p>
      )}
    </section>
  )
}

export default InputPanel
