import useAuth from '../context/useAuth.js'

export default function OfflineStatus({ message = '' }) {
  const { offlineSync, status } = useAuth()
  const offline = !offlineSync.online || status === 'authenticated-offline'
  const failedItems = offlineSync.failedItems || []

  let headline = message
  if (!headline && offline) {
    headline = 'Offline mode: changes are saved on this device and will sync when connection returns.'
  } else if (!headline) {
    headline = offlineSync.error ||
      (offlineSync.pending > 0 ? `${offlineSync.pending} change(s) waiting to sync.` : '')
  }

  if (!headline && failedItems.length === 0) {
    return null
  }

  return (
    <div
      className="mb-5 rounded-lg border border-[#8a7540] bg-[#2c291c] px-4 py-3 text-sm text-[#f0dfaa]"
      role="status"
    >
      {headline && <p>{headline}</p>}
      {failedItems.length > 0 && (
        <div className={headline ? 'mt-2' : ''}>
          <p>The server rejected these changes. Edit or delete them to try again:</p>
          <ul className="mt-1 list-disc pl-5">
            {failedItems.map((item, index) => (
              <li key={index}>{item.name}: {item.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}