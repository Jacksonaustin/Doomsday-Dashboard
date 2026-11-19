import {
  addChecklistItem,
  createInventoryItem,
  deleteChecklistItem,
  deleteInventoryItem,
  getChecklistItems,
  getInventoryItems,
  updateChecklistItem,
  updateInventoryItem,
} from './api.js'

const DATABASE_NAME = 'doomsday-dashboard-offline'
const DATABASE_VERSION = 1
const RECORDS_STORE = 'records'
const USERS_STORE = 'users'
const SESSION_STORE = 'session'
const SYNC_INTERVAL = 5 * 60 * 1000

let databasePromise
const syncPromises = new Map()

function openDatabase() {
  if (!globalThis.indexedDB) {
    return Promise.reject(new Error('This browser does not support offline storage.'))
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(RECORDS_STORE)) {
          database.createObjectStore(RECORDS_STORE, { keyPath: 'key' })
        }
        if (!database.objectStoreNames.contains(USERS_STORE)) {
          database.createObjectStore(USERS_STORE, { keyPath: 'id' })
        }
        if (!database.objectStoreNames.contains(SESSION_STORE)) {
          database.createObjectStore(SESSION_STORE, { keyPath: 'key' })
        }
      }
      request.onsuccess = () => {
        const database = request.result
        database.onversionchange = () => database.close()
        resolve(database)
      }
      request.onerror = () => {
        databasePromise = null
        reject(request.error || new Error('Unable to open offline storage.'))
      }
      request.onblocked = () => {
        reject(new Error('Offline storage is blocked by another browser tab.'))
      }
    })
  }

  return databasePromise
}

async function transact(storeName, mode, action) {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode)
    const complete = new Promise((done, fail) => {
      transaction.oncomplete = done
      transaction.onerror = () => fail(transaction.error)
      transaction.onabort = () => fail(transaction.error || new Error('Offline storage transaction failed.'))
    })

    Promise.resolve(action(transaction.objectStore(storeName)))
      .then(async (result) => {
        try {
          await complete
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      .catch((error) => {
        try {
          transaction.abort()
        } catch {
          reject(error)
          return
        }
        complete.catch(() => reject(error))
      })
  })
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function recordKey(ownerId, collection, id) {
  return `${ownerId}:${collection}:${id}`
}

function makeLocalId() {
  return `local:${crypto.randomUUID()}`
}

function emitDataChange(ownerId) {
  window.dispatchEvent(new CustomEvent('offline-data-change', { detail: { ownerId } }))
}

function emitSyncStatus(ownerId, status) {
  window.dispatchEvent(new CustomEvent('offline-sync-status', {
    detail: { ownerId, ...status }
  }))
}

function getApiMethods(collection) {
  if (collection === 'inventory') {
    return {
      list: getInventoryItems,
      create: createInventoryItem,
      update: updateInventoryItem,
      remove: deleteInventoryItem
    }
  }

  if (collection === 'checklist') {
    return {
      list: getChecklistItems,
      create: addChecklistItem,
      update: updateChecklistItem,
      remove: deleteChecklistItem
    }
  }

  throw new Error(`Unknown offline collection: ${collection}`)
}

function publicRecord(record) {
  return {
    ...record.data,
    id: record.id,
    syncPending: record.syncState === 'pending'
  }
}

async function getOwnerRecords(ownerId, collection) {
  return transact(RECORDS_STORE, 'readonly', async (store) => {
    const records = await requestResult(store.getAll())
    return records.filter(
      (record) => record.ownerId === ownerId && record.collection === collection
    )
  })
}

async function getRecord(ownerId, collection, id) {
  return transact(RECORDS_STORE, 'readonly', (store) => (
    requestResult(store.get(recordKey(ownerId, collection, id)))
  ))
}

async function putRecord(record) {
  await transact(RECORDS_STORE, 'readwrite', (store) => requestResult(store.put(record)))
}

async function removeRecord(key) {
  await transact(RECORDS_STORE, 'readwrite', (store) => requestResult(store.delete(key)))
}

async function getPendingRecords(ownerId) {
  const records = await transact(RECORDS_STORE, 'readonly', async (store) => {
    const allRecords = await requestResult(store.getAll())
    return allRecords.filter(
      (record) => record.ownerId === ownerId &&
        (record.collection === 'inventory' || record.collection === 'checklist') &&
        record.syncState === 'pending'
    )
  })
  return records.sort((a, b) => a.updatedAt - b.updatedAt)
}

async function getPendingCount(ownerId) {
  return (await getPendingRecords(ownerId)).length
}

async function reconcileRemote(ownerId, collection, remoteItems) {
  const cached = await getOwnerRecords(ownerId, collection)
  const byRemoteId = new Map()
  const byNaturalId = new Map()
  for (const record of cached) {
    if (record.remoteId) byRemoteId.set(record.remoteId, record)

    const naturalId = collection === 'inventory'
      ? record.clientId
      : record.data.recommendationId
    if (naturalId) byNaturalId.set(naturalId, record)
  }
  const remoteIds = new Set(remoteItems.map((item) => item.id))

  await transact(RECORDS_STORE, 'readwrite', async (store) => {
    for (const record of cached) {
      if (
        record.syncState === 'synced' &&
        record.remoteId &&
        !remoteIds.has(record.remoteId)
      ) {
        store.delete(record.key)
      }
    }

    for (const item of remoteItems) {
      const naturalId = collection === 'inventory'
        ? item.clientId
        : item.recommendationId
      const existing = byRemoteId.get(item.id) ||
        (naturalId ? byNaturalId.get(naturalId) : null)
      if (existing?.syncState === 'pending' || existing?.deleted) continue

      const id = existing?.id || item.id
      store.put({
        key: recordKey(ownerId, collection, id),
        ownerId,
        collection,
        id,
        remoteId: item.id,
        clientId: existing?.clientId || null,
        data: { ...item, id },
        syncState: 'synced',
        deleted: false,
        updatedAt: Date.now()
      })
    }
  })
}

async function readCollection(ownerId, collection) {
  const records = await getOwnerRecords(ownerId, collection)
  return records.filter((record) => !record.deleted).map(publicRecord)
}

export async function loadOfflineCollection(ownerId, collection) {
  const cachedItems = await readCollection(ownerId, collection)
  const methods = getApiMethods(collection)

  if (navigator.onLine) {
    try {
      const response = await methods.list()
      await reconcileRemote(ownerId, collection, response.data.items)
      await syncPendingChanges(ownerId)
      return {
        items: await readCollection(ownerId, collection),
        offline: false,
        error: ''
      }
    } catch (error) {
      if ([401, 403].includes(error.response?.status)) throw error

      return {
        items: cachedItems,
        offline: true,
        error: error.response?.status === 401
          ? 'Your session expired. Sign in again when you are online.'
          : 'The server is unavailable. Showing saved data on this device.'
      }
    }
  }

  return {
    items: cachedItems,
    offline: true,
    error: 'You are offline. Showing saved data on this device.'
  }
}

async function syncRecord(initialRecord) {
  const record = await getRecord(
    initialRecord.ownerId,
    initialRecord.collection,
    initialRecord.id
  )
  if (!record || record.syncState !== 'pending') return

  const methods = getApiMethods(record.collection)
  if (record.deleted) {
    if (record.remoteId) {
      await methods.remove(record.remoteId)
    }
    await removeRecord(record.key)
    return
  }

  let remoteItem
  let remoteId = record.remoteId
  if (!remoteId) {
    const payload = record.collection === 'inventory'
      ? { ...record.data, clientId: record.clientId }
      : record.data
    const response = await methods.create(payload)
    remoteItem = response.data.item
    remoteId = remoteItem.id
  } else {
    const response = await methods.update(remoteId, record.data)
    remoteItem = response.data.item
  }

  const latest = await getRecord(record.ownerId, record.collection, record.id)
  if (!latest) return
  if (latest.deleted) {
    if (!latest.remoteId && remoteId) {
      await putRecord({ ...latest, remoteId })
    }
    return
  }

  const unchanged = latest.updatedAt === record.updatedAt
  await putRecord({
    ...latest,
    remoteId,
    clientId: latest.clientId,
    data: unchanged && remoteItem
      ? { ...remoteItem, id: latest.id }
      : { ...latest.data, id: latest.id },
    syncState: unchanged ? 'synced' : 'pending'
  })
}

export async function syncPendingChanges(ownerId) {
  if (syncPromises.has(ownerId)) return syncPromises.get(ownerId)

  const syncPromise = (async () => {
    let error = ''
    if (navigator.onLine) {
      try {
        for (let round = 0; round < 10; round += 1) {
          const records = await getPendingRecords(ownerId)
          if (records.length === 0) break

          let failed = false
          for (const record of records) {
            try {
              await syncRecord(record)
            } catch (syncError) {
              error = syncError.response?.data?.message || 'Some changes could not be synced yet.'
              failed = true
              break
            }
          }
          if (failed) break
        }
      } catch {
        error = 'Unable to access locally saved changes.'
      }
    }

    const pending = await getPendingCount(ownerId).catch(() => 0)
    const status = {
      online: navigator.onLine,
      pending,
      error
    }
    emitSyncStatus(ownerId, status)
    return status
  })()

  syncPromises.set(ownerId, syncPromise)
  try {
    return await syncPromise
  } finally {
    syncPromises.delete(ownerId)
  }
}

async function saveLocalItem(ownerId, collection, data, existingItem = null) {
  const id = existingItem?.id || makeLocalId()
  const oldRecord = existingItem
    ? await getRecord(ownerId, collection, id)
    : null
  const clientId = oldRecord?.clientId || (
    collection === 'inventory' && !existingItem ? crypto.randomUUID() : null
  )
  const record = {
    key: recordKey(ownerId, collection, id),
    ownerId,
    collection,
    id,
    remoteId: oldRecord?.remoteId || (
      existingItem && !existingItem.id.startsWith('local:') ? existingItem.id : null
    ),
    clientId,
    data: { ...data, id },
    syncState: 'pending',
    deleted: false,
    updatedAt: Date.now()
  }

  await putRecord(record)
  emitDataChange(ownerId)
  await syncPendingChanges(ownerId)
  const latest = await getRecord(ownerId, collection, id)
  return latest ? publicRecord(latest) : publicRecord(record)
}

export async function createLocalItem(ownerId, collection, data) {
  return saveLocalItem(ownerId, collection, data)
}

export async function updateLocalItem(ownerId, collection, item, data) {
  return saveLocalItem(ownerId, collection, data, item)
}

export async function deleteLocalItem(ownerId, collection, item) {
  const record = await getRecord(ownerId, collection, item.id)
  if (!record) {
    throw new Error('The saved item could not be found on this device.')
  }

  await putRecord({
    ...record,
    deleted: true,
    syncState: 'pending',
    updatedAt: Date.now()
  })
  emitDataChange(ownerId)
  await syncPendingChanges(ownerId)
}

export async function saveCachedUser(user) {
  await transact(USERS_STORE, 'readwrite', (store) => requestResult(store.put(user)))
  await transact(SESSION_STORE, 'readwrite', (store) => (
    requestResult(store.put({ key: 'currentUserId', userId: user.id }))
  ))
}

export async function getCachedUser() {
  const session = await transact(SESSION_STORE, 'readonly', (store) => (
    requestResult(store.get('currentUserId'))
  ))
  if (!session?.userId) return null

  return transact(USERS_STORE, 'readonly', (store) => requestResult(store.get(session.userId)))
}

export async function clearCachedSession() {
  await transact(SESSION_STORE, 'readwrite', (store) => requestResult(store.delete('currentUserId')))
}

export function startOfflineSync(ownerId, onStatus) {
  let active = true
  const sync = async () => {
    const status = await syncPendingChanges(ownerId)
    if (active) onStatus(status)
  }
  const updateOnlineStatus = () => {
    if (!navigator.onLine) {
      getPendingCount(ownerId).then((pending) => {
        if (active) onStatus({ online: false, pending, error: '' })
      })
    } else {
      sync()
    }
  }
  const handleDataChange = (event) => {
    if (event.detail?.ownerId === ownerId) sync()
  }

  sync()
  const intervalId = window.setInterval(sync, SYNC_INTERVAL)
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  window.addEventListener('offline-data-change', handleDataChange)

  return () => {
    active = false
    window.clearInterval(intervalId)
    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', updateOnlineStatus)
    window.removeEventListener('offline-data-change', handleDataChange)
  }
}
