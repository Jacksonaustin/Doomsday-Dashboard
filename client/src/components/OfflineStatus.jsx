import useAuth from '../context/useAuth.js'

export default function OfflineStatus({ message = '' }) {
  const { offlineSync, status } = useAuth()
  const offline = !offlineSync.online || status === 'authenticated-offline'

  if (!message && !offline && offlineSync.pending === 0 && !offlineSync.error) {
    return null
  }

  return (
    <div
      className="mb-5 rounded-lg border border-[#8a7540] bg-[#2c291c] px-4 py-3 text-sm text-[#f0dfaa]"
      role="status"
    >
      {message || (offline
        ? 'Offline mode: changes are saved on this device and will sync when connection returns.'
        : offlineSync.error || `${offlineSync.pending} change(s) waiting to sync.`)}
    </div>
  )
}
