import { useAppStore } from '../store/app-store'

export default function SyncOverlay() {
  const { syncProgress } = useAppStore()

  const progress = syncProgress || {}
  const percentage = progress.total
    ? Math.round((progress.current / progress.total) * 100)
    : 0

  return (
    <div className="sync-overlay">
      <div className="sync-card animate-in">
        <h3>🔄 Syncing Items</h3>
        <div className="sync-progress-bar">
          <div
            className="sync-progress-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="sync-message">
          {progress.message || 'Connecting to PoE API...'}
        </div>
        {progress.current && progress.total && (
          <div className="sync-detail">
            {progress.current} / {progress.total}
          </div>
        )}
      </div>
    </div>
  )
}
