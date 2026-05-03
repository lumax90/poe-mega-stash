import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore } from '../store/app-store'
import guideMarkdown from '../content/guide.md?raw'

export default function GuidePanel() {
  const { setCurrentView } = useAppStore()

  return (
    <div className="guide-panel animate-in">
      <div className="guide-panel-toolbar">
        <h2 className="guide-panel-title">Guide</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCurrentView('items')}>
          ← Back
        </button>
      </div>
      <div className="guide-markdown">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children, ...props }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            )
          }}
        >
          {guideMarkdown}
        </ReactMarkdown>
      </div>
    </div>
  )
}
