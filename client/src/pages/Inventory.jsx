import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import OfflineStatus from '../components/OfflineStatus.jsx'
import useAuth from '../context/useAuth.js'
import {
  createLocalItem,
  deleteLocalItem,
  loadOfflineCollection,
  updateLocalItem,
} from '../services/offlineData.js'
import { parseBulkInventory } from '../utils/parseBulkInventory.js'
import { classifySupply } from '../utils/classifySupply.js'
import api from '../services/api.js'

const CATEGORIES = [
  { label: 'All Supplies', value: 'all' },
  { label: 'Liquids', value: 'liquid' },
  { label: 'Food', value: 'food' },
  { label: 'Medical', value: 'medical' },
  { label: 'Power', value: 'power' },
  { label: 'Shelter', value: 'shelter' },
  { label: 'Tools', value: 'tools' },
  { label: 'Hygiene', value: 'hygiene' },
  { label: 'Other', value: 'other' },
]

const CATEGORY_RESOURCES = {
  liquid: [
    { value: 'water', label: 'Water', units: ['gallons', 'liters', 'fluid_ounces'] },
    { value: 'drink', label: 'Shelf-stable drink', units: ['gallons', 'liters', 'fluid_ounces'] },
  ],
  food: [
    { value: 'meal', label: 'Meals', units: ['meals'] },
    { value: 'infant_food', label: 'Infant formula / baby food', units: ['days'] },
    { value: 'pet_food', label: 'Pet food', units: ['days'] },
  ],
  medical: [
    { value: 'first_aid_kit', label: 'First aid kit', units: ['pieces'] },
    { value: 'medication', label: 'Medication', units: ['days'] },
    { value: 'other', label: 'other', units: ['pieces']},
  ],
  power: [
    { value: 'flashlight', label: 'Flashlight', units: ['pieces'] },
    { value: 'battery_pack', label: 'Battery pack', units: ['pieces'] },
    { value: 'other', label: 'other', units: ['pieces']},
  ],
  shelter: [{ value: 'shelter', label: 'Shelter', units: ['pieces'] }],
  tools: [{ value: 'radio', label: 'Emergency radio', units: ['pieces'] },
          { value: 'other', label: 'other', units: ['pieces']},
  ],
  hygiene: [{ value: 'sanitation', label: 'Sanitation supplies', units: ['pieces'] },
            { value: 'other', label: 'other', units: ['pieces']},
  ],
  other: [{ value: 'other', label: 'Other', units: ['pieces'] }],
}

const UNIT_LABELS = {
  pieces: 'Pieces',
  gallons: 'Gallons',
  liters: 'Liters',
  fluid_ounces: 'Fluid ounces',
  meals: 'Meals',
  days: 'Days',
}

const INITIAL_FORM = {
  name: '',
  quantity: '1',
  category: 'food',
  resourceType: 'meal',
  unit: 'meals',
  shelfStable: true,
}

function categoryLabel(value) {
  return CATEGORIES.find((category) => category.value === value)?.label || 'Other'
}

function getErrorMessage(error) {
  return error.response?.data?.message || 'Something went wrong. Please try again.'
}

export default function InventoryPage() {
  const { refreshSession, user } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [offlineMessage, setOfflineMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [pendingItems, setPendingItems] = useState([])
  const [bulkText, setBulkText] = useState('')
  const [bulkPreview, setBulkPreview] = useState([])
  const [addMode, setAddMode] = useState('smart')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const resources = useMemo(
    () => CATEGORY_RESOURCES[form.category] || CATEGORY_RESOURCES.other,
    [form.category],
  )

  const selectedResource =
    resources.find((resource) => resource.value === form.resourceType) || resources[0]

  const fetchItems = useCallback(async () => {
    return loadOfflineCollection(user.id, 'inventory')
  }, [user.id])

  const loadItems = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')

    try {
      const result = await fetchItems()
      setItems(result.items)
      setOfflineMessage(result.error)
    } catch (error) {
      if (error.response?.status === 401) {
        await refreshSession()
      } else {
        setLoadError(getErrorMessage(error))
      }
    } finally {
      setIsLoading(false)
    }
  }, [fetchItems, refreshSession])

  useEffect(() => {
    let active = true

    const applyLoadedItems = (result) => {
      if (active) {
        setItems(result.items)
        setOfflineMessage(result.error)
        setLoadError('')
      }
    }

    const handleOnline = () => {
      fetchItems()
        .then(applyLoadedItems)
        .catch((error) => {
          if (active) setLoadError(getErrorMessage(error))
        })
    }

    fetchItems()
      .then((result) => {
        applyLoadedItems(result)
      })
      .catch((error) => {
        if (!active) return

        if (error.response?.status === 401) {
          refreshSession()
        } else {
          setLoadError(getErrorMessage(error))
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })
    window.addEventListener('online', handleOnline)

    return () => {
      active = false
      window.removeEventListener('online', handleOnline)
    }
  }, [fetchItems, refreshSession])

  const visibleItems = items.filter(
    (item) => selectedCategory === 'all' || item.category === selectedCategory,
  )

  function openAddModal() {
    setBulkText('')
    setBulkPreview([])
    setAddMode('smart')
    const category = selectedCategory === 'all' ? 'food' : selectedCategory
    const defaultResource = CATEGORY_RESOURCES[category][0]
    setEditingItem(null)
    setPendingItems([])
    setForm({
      ...INITIAL_FORM,
      category,
      resourceType: defaultResource.value,
      unit: defaultResource.units[0],
    })
    setFormError('')
    setIsModalOpen(true)
  }

  function openEditModal(item) {
    setEditingItem(item)
    setPendingItems([])
    setForm({
      name: item.name,
      quantity: String(item.quantity),
      category: item.category,
      resourceType: item.resourceType,
      unit: item.unit,
      shelfStable: item.shelfStable ?? true,
    })
    setFormError('')
    setIsModalOpen(true)
  }

  function closeModal() {
    if (isSaving) return
    setIsModalOpen(false)
    setEditingItem(null)
    setPendingItems([])
    setFormError('')
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setFormError('')
  }

  function updateCategory(category) {
    const resource = CATEGORY_RESOURCES[category][0]
    setForm((current) => ({
      ...current,
      category,
      resourceType: resource.value,
      unit: resource.units[0],
    }))
    setFormError('')
  }

  function updateResource(resourceType) {
    const resource = resources.find((option) => option.value === resourceType)
    setForm((current) => ({
      ...current,
      resourceType,
      unit: resource.units[0],
    }))
    setFormError('')
  }
  function updateBulkItem(index, field, value) {
  setBulkPreview((current) =>
    current.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    )
  )
}
function updateBulkUnit(index, unit) {
  setBulkPreview((current) =>
    current.map((item, i) =>
      i === index
        ? {
            ...item,
            suggestion: {
              ...item.suggestion,
              unit,
            },
          }
        : item
    )
  )
}
function updateBulkResource(index, resourceType) {
  setBulkPreview((current) =>
    current.map((item, i) => {
      if (i !== index) return item

      const category = item.suggestion?.category ?? 'other'
      const resource = CATEGORY_RESOURCES[category].find(
        (option) => option.value === resourceType
      )

      if (!resource) return item

      return {
        ...item,
        suggestion: {
          category,
          resourceType,
          unit: resource.units[0],
        },
      }
    })
  )
}
function updateBulkCategory(index, category) {
  const resource = CATEGORY_RESOURCES[category][0]

  setBulkPreview((current) =>
    current.map((item, i) =>
      i === index
        ? {
            ...item,
            suggestion: {
              category,
              resourceType: resource.value,
              unit: resource.units[0],
            },
          }
        : item
    )
  )
}

function removeBulkItem(index) {
  setBulkPreview((current) =>
    current.filter((_, i) => i !== index)
  )
}

    async function handleBulkPreview() {
      const parsed = parseBulkInventory(bulkText)
      setFormError('')

      const preview = await Promise.all(
        parsed.map(async (item) => {
          // First, try our JavaScript rules for regular supplies.
          const supplyMatch = classifySupply(item.name)

          if (supplyMatch) {
            return { ...item, suggestion: supplyMatch }
          }

          // If no supply rule matched, ask the existing food AI.
          try {
            const response = await api.post('/inventory/classify', {
              name: item.originalText,
            })

            const result = response.data?.data

            if (
              result?.matched &&
              ['meal', 'infant_food', 'pet_food'].includes(result.resourceType)
            ) {
              const resource = CATEGORY_RESOURCES.food.find(
                (option) => option.value === result.resourceType
              )

              return {
                ...item,
                suggestion: {
                  category: 'food',
                  resourceType: resource.value,
                  unit: resource.units[0],
                },
              }
            }
          } catch (error) {
            console.warn('Food classification unavailable:', error)
          }

          // Unknown items stay available for manual review.
          return { ...item, suggestion: null }
        })
      )

      setBulkPreview(preview)
    }




    function handleAddAnother() {
    const name = form.name.trim()
    const quantity = Number(form.quantity)

  if (!name || name.length > 100) {
    setFormError('Enter an item name with no more than 100 characters.')
    return
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    setFormError('Quantity must be greater than zero.')
    return
  }

    const newItem = {
      name,
      quantity,
      category: form.category,
      resourceType: form.resourceType,
      unit: form.unit,
      ...(form.resourceType === 'drink'
        ? { shelfStable: form.shelfStable }
        : {}),
    }

  setPendingItems((current) => [...current, newItem])
  setForm((current) => ({ ...current, name: '', quantity: '1' }))
  setFormError('')
}

async function handleBulkSave() {
  if (bulkPreview.length === 0) {
    setFormError('Preview at least one item before saving.')
    return
  }

  const unreviewed = bulkPreview.findIndex((item) => !item.suggestion)

  if (unreviewed !== -1) {
    setFormError(`Please review the category for Item ${unreviewed + 1}.`)
    return
  }

  const itemsToSave = bulkPreview.map((item) => ({
    name: item.name.trim(),
    quantity: Number(item.quantity),
    category: item.suggestion.category,
    resourceType: item.suggestion.resourceType,
    unit: item.suggestion.unit,
    ...(item.suggestion.resourceType === 'drink'
      ? { shelfStable: item.shelfStable ?? false }
      : {}),
  }))

  const invalidIndex = itemsToSave.findIndex((item) => {
    const resource = CATEGORY_RESOURCES[item.category]?.find(
      (option) => option.value === item.resourceType
    )

    return (
      !item.name ||
      item.name.length > 100 ||
      !Number.isFinite(item.quantity) ||
      item.quantity <= 0 ||
      !resource ||
      !resource.units.includes(item.unit)
    )
  })

  if (invalidIndex !== -1) {
    setFormError(`Please check the fields for Item ${invalidIndex + 1}.`)
    return
  }

  setIsSaving(true)
  setFormError('')
  setNotice('')

  try {
    const results = await Promise.allSettled(
      itemsToSave.map((item) => createLocalItem(user.id, 'inventory', item))
    )

    const savedItems = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : []
    )

    const failedItems = bulkPreview.filter(
      (_, index) => results[index].status === 'rejected'
    )

    setItems((current) => [...savedItems, ...current])

    if (failedItems.length > 0) {
      setBulkPreview(failedItems)
      setFormError(
        `${savedItems.length} saved, ${failedItems.length} failed. Retry the remaining items.`
      )
      return
    }

    setNotice(`${savedItems.length} inventory item(s) added.`)
    setBulkPreview([])
    setBulkText('')
    setIsModalOpen(false)
  } catch (error) {
    setFormError(getErrorMessage(error))
  } finally {
    setIsSaving(false)
  }
}

  async function handleSubmit(event) {
    event.preventDefault()
    if (!editingItem && addMode === 'smart') return
    const name = form.name.trim()
    const quantity = Number(form.quantity)
    const hasCurrentItem = name.length > 0

  if ((editingItem || hasCurrentItem) && (!name || name.length > 100)) {
    setFormError('Enter an item name with no more than 100 characters.')
    return
  }

  if ((editingItem || hasCurrentItem) && (!Number.isFinite(quantity) || quantity <= 0)) {
    setFormError('Quantity must be greater than zero.')
    return
  }

  if (!editingItem && !hasCurrentItem && pendingItems.length === 0) {
    setFormError('Enter an item name.')
    return
  }

    setIsSaving(true)
    setFormError('')
    setNotice('')
    const itemData = {
      name,
      quantity,
      category: form.category,
      resourceType: form.resourceType,
      unit: form.unit,
      ...(form.resourceType === 'drink' ? { shelfStable: form.shelfStable } : {}),
    }

    try {
  if (editingItem) {
    const savedItem = await updateLocalItem(user.id, 'inventory', editingItem, itemData)

    setItems((current) =>
      current.map((item) =>
        item.id === savedItem.id ? savedItem : item
      )
    )

    setNotice('Inventory item updated.')
  } else {
    const itemsToSave = [
      ...pendingItems,
      ...(hasCurrentItem ? [itemData] : []),
    ]

    const results = await Promise.allSettled(
      itemsToSave.map((item) => createLocalItem(user.id, 'inventory', item))
    )

    const savedItems = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : []
    )

    const failedItems = itemsToSave.filter(
      (_, index) => results[index].status === 'rejected'
    )

    setItems((current) => [...savedItems, ...current])

    if (failedItems.length > 0) {
      setPendingItems(failedItems)
      setForm((current) => ({ ...current, name: '', quantity: '1' }))
      setFormError(
        `${savedItems.length} saved, ${failedItems.length} failed. Try saving the remaining items again.`
      )

      return
    }

    setPendingItems([])
    setNotice(`${savedItems.length} inventory item(s) added.`)
  }

  setIsModalOpen(false)
  setEditingItem(null)
    } catch (error) {
      setFormError(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}" from your inventory?`)) return

    setDeletingId(item.id)
    setNotice('')
    setLoadError('')

    try {
      await deleteLocalItem(user.id, 'inventory', item)
      setItems((current) => current.filter((entry) => entry.id !== item.id))
      setNotice(`${item.name} was deleted.`)
    } catch (error) {
      if (error.response?.status === 401) {
        await refreshSession()
      } else {
        setLoadError(getErrorMessage(error))
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-[#101713] text-[#eaf2ea]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <OfflineStatus message={offlineMessage} />

    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-3xl font-bold">
        Inventory
      </h1>

      <Link
        to="/profile"
        className="rounded-lg border border-[#304235] bg-[#18231c] px-4 py-2 text-sm font-medium text-[#b6db8a] transition-colors hover:bg-[#304235]"
      >
        Edit Household
      </Link>
    </div>

    <p className="mt-2 text-[#b5c6b7]">
      Keep track of your household emergency supplies.
    </p>


        <div className="mt-8 flex flex-col gap-6 md:flex-row">
          <aside className="w-full rounded-xl border border-[#304235] bg-[#18231c] p-4 md:w-56">
            <h2 className="font-semibold">Categories</h2>
            <ul className="mt-4 space-y-2">
              {CATEGORIES.map((category) => (
                <li key={category.value}>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(category.value)}
                    aria-pressed={selectedCategory === category.value}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      selectedCategory === category.value
                        ? 'border-[#81aa69] bg-[#304235] font-semibold text-[#eaf2ea]'
                        : 'border-transparent text-[#b5c6b7] hover:bg-[#304235]'
                    }`}
                  >
                    {category.label}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section
            className="min-h-80 flex-1 rounded-xl border border-[#304235] bg-[#18231c] p-6"
            aria-labelledby="inventory-heading"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id="inventory-heading" className="text-xl font-semibold">
                {categoryLabel(selectedCategory)}
              </h2>
              <button
                type="button"
                onClick={openAddModal}
                className="rounded-md bg-[#b6db8a] px-4 py-2 text-sm font-semibold text-[#101713] transition-colors hover:bg-[#c9eca0]"
              >
                + Add Item
              </button>
            </div>

            {notice && (
              <p className="mt-4 rounded-md border border-[#4d8d55] bg-[#1d3826] p-3 text-sm text-[#c6efbd]" role="status">
                {notice}
              </p>
            )}

            {loadError && (
              <div className="mt-4 rounded-md border border-[#87524a] bg-[#372321] p-3 text-sm text-[#f1bbb5]" role="alert">
                <p>{loadError}</p>
                <button className="mt-2 underline" type="button" onClick={loadItems}>
                  Try again
                </button>
              </div>
            )}

            {isLoading ? (
              <p className="mt-6 text-sm text-[#b5c6b7]" role="status">Loading inventory…</p>
            ) : visibleItems.length === 0 ? (
              <div className="mt-6 rounded-lg border border-dashed border-[#405443] p-8 text-center">
                <p className="font-medium">No supplies in this category yet.</p>
                <p className="mt-2 text-sm text-[#b5c6b7]">
                  Add an item to start tracking your household inventory.
                </p>
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[#304235] text-[#b5c6b7]">
                    <tr>
                      <th className="px-3 py-3">Item</th>
                      <th className="px-3 py-3">Quantity</th>
                      <th className="px-3 py-3">Unit</th>
                      <th className="px-3 py-3">Category</th>
                      <th className="px-3 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => (
                      <tr key={item.id} className="border-b border-[#304235]">
                        <td className="px-3 py-3">
                          <span>{item.name}</span>
                          {item.resourceType === 'drink' && item.shelfStable && (
                            <span className="ml-2 text-xs text-[#b5c6b7]">(shelf-stable)</span>
                          )}
                        </td>
                        <td className="px-3 py-3">{item.quantity}</td>
                        <td className="px-3 py-3">{UNIT_LABELS[item.unit] || item.unit}</td>
                        <td className="px-3 py-3">{categoryLabel(item.category)}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex justify-end gap-3">
                            <button
                              className="text-[#b6db8a] hover:underline"
                              type="button"
                              onClick={() => openEditModal(item)}
                            >
                              Edit
                            </button>
                            <button
                              className="text-[#f1bbb5] hover:underline disabled:opacity-50"
                              type="button"
                              disabled={deletingId === item.id}
                              onClick={() => handleDelete(item)}
                            >
                              {deletingId === item.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-dialog-title"
            className="w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-[#304235] bg-[#18231c] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id="item-dialog-title" className="text-xl font-semibold">
                {editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                aria-label="Close dialog"
                className="rounded-md px-2 py-1 text-[#b5c6b7] hover:bg-[#304235] hover:text-white"
              >
                X
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>

          {!editingItem && (
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#101713] p-1">
              <button
                type="button"
                aria-pressed={addMode === 'smart'}
                onClick={() => {
                  setAddMode('smart')
                  setFormError('')
                }}
                className={`rounded-md px-4 py-3 text-sm font-semibold transition-colors ${
                  addMode === 'smart'
                    ? 'bg-[#b6db8a] text-[#101713]'
                    : 'text-[#b5c6b7] hover:bg-[#304235]'
                }`}
              >
                Smart Add
              </button>

              <button
                type="button"
                aria-pressed={addMode === 'manual'}
                onClick={() => {
                  setAddMode('manual')
                  setFormError('')
                }}
                className={`rounded-md px-4 py-3 text-sm font-semibold transition-colors ${
                  addMode === 'manual'
                    ? 'bg-[#b6db8a] text-[#101713]'
                    : 'text-[#b5c6b7] hover:bg-[#304235]'
                }`}
              >
                Manual Add
              </button>
            </div>
          )}


        {!editingItem && addMode === 'smart' && (
          <div className="rounded-lg border border-[#304235] bg-[#101713] p-4">
            <label htmlFor="bulk-input" className="mb-2 block text-sm font-semibold">
              Smart Bulk Add
            </label>

            <textarea
              id="bulk-input"
              rows={3}
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              placeholder="3 flashlights, 12 batteries, 6 cans of soup..."
              className="w-full rounded-md border border-[#304235] bg-[#18231c] p-3 text-sm text-white"
            />

            <button
              type="button"
              onClick={handleBulkPreview}
              className="mt-3 rounded-md bg-[#b6db8a] px-4 py-2 text-sm font-semibold text-[#101713]"
            >
              Preview Items
            </button>

            {bulkPreview.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold">
                  {bulkPreview.length} items detected
                </p>


                {bulkPreview.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-[#304235] bg-[#18231c] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold">Item {index + 1}</p>

                      <button
                        type="button"
                        onClick={() => removeBulkItem(index)}
                        className="text-sm text-[#f1bbb5] hover:underline"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                      <div>
                        <label
                          htmlFor={`bulk-name-${index}`}
                          className="mb-1 block text-xs text-[#b5c6b7]"
                        >
                          Item Name
                        </label>
                        <input
                          id={`bulk-name-${index}`}
                          value={item.name}
                          onChange={(event) =>
                            updateBulkItem(index, 'name', event.target.value)
                          }
                          maxLength={100}
                          className="w-full rounded-md border border-[#304235] bg-[#101713] p-2 text-sm"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`bulk-quantity-${index}`}
                          className="mb-1 block text-xs text-[#b5c6b7]"
                        >
                          Quantity
                        </label>
                        <input
                          id={`bulk-quantity-${index}`}
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={(event) =>
                            updateBulkItem(index, 'quantity', event.target.value)
                          }
                          className="w-full rounded-md border border-[#304235] bg-[#101713] p-2 text-sm"
                        />
                      </div>
                    </div>


                  <div className="mt-3">
                    <label
                      htmlFor={`bulk-category-${index}`}
                      className="mb-1 block text-xs text-[#b5c6b7]"
                    >
                      Category
                    </label>

                    <select
                      id={`bulk-category-${index}`}
                      value={item.suggestion?.category ?? 'other'}
                      onChange={(event) =>
                        updateBulkCategory(index, event.target.value)
                      }
                      className="w-full rounded-md border border-[#304235] bg-[#101713] p-2 text-sm"
                    >
                      {CATEGORIES.filter((category) => category.value !== 'all').map(
                        (category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        )
                      )}
                    </select>

                  {!item.suggestion && (
                    <div className="mt-2 text-xs text-[#f4c27a]">
                      <p>Category wasn't recognized. Please review this item.</p>
                      <button
                        type="button"
                        onClick={() => updateBulkCategory(index, 'other')}
                        className="mt-2 underline"
                      >
                        Keep as Other
                      </button>
                    </div>
                  )}
                  </div>

                  <div className="mt-3">
                    <label
                      htmlFor={`bulk-resource-${index}`}
                      className="mb-1 block text-xs text-[#b5c6b7]"
                    >
                      Supply Type
                    </label>

                    <select
                      id={`bulk-resource-${index}`}
                      value={item.suggestion?.resourceType ?? 'other'}
                      onChange={(event) =>
                        updateBulkResource(index, event.target.value)
                      }
                      className="w-full rounded-md border border-[#304235] bg-[#101713] p-2 text-sm"
                    >
                      {CATEGORY_RESOURCES[
                        item.suggestion?.category ?? 'other'
                      ].map((resource) => (
                        <option key={resource.value} value={resource.value}>
                          {resource.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-3">
                    <label
                      htmlFor={`bulk-unit-${index}`}
                      className="mb-1 block text-xs text-[#b5c6b7]"
                    >
                      Unit
                    </label>

                    <select
                      id={`bulk-unit-${index}`}
                      value={
                        item.suggestion?.unit ??
                        CATEGORY_RESOURCES.other[0].units[0]
                      }
                      onChange={(event) =>
                        updateBulkUnit(index, event.target.value)
                      }
                      className="w-full rounded-md border border-[#304235] bg-[#101713] p-2 text-sm"
                    >
                      {(
                        CATEGORY_RESOURCES[
                          item.suggestion?.category ?? 'other'
                        ].find(
                          (resource) =>
                            resource.value === (item.suggestion?.resourceType ?? 'other')
                        )?.units ?? ['pieces']
                      ).map((unit) => (
                        <option key={unit} value={unit}>
                          {UNIT_LABELS[unit]}
                        </option>
                      ))}
                    </select>
                  </div>


                  </div>
                ))}

              </div>
            )}


            {bulkPreview.length > 0 && (
              <button
                type="button"
                onClick={handleBulkSave}
                disabled={isSaving}
                className="mt-4 w-full rounded-md bg-[#b6db8a] px-4 py-3 text-sm font-semibold text-[#101713] hover:bg-[#c9eca0] disabled:opacity-60"
              >
                {isSaving
                  ? 'Saving Items...'
                  : `Save All ${bulkPreview.length} Items`}
              </button>
            )}

            <p className="mt-3 text-xs text-[#b5c6b7]">
              Review each item before saving.
            </p>

          </div>
        )}
            {(editingItem || addMode === 'manual') && (
              <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="item-name">
                  Item Name
                </label>
                <input
                  id="item-name"
                  type="text"
                  maxLength="100"
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder="Enter item name"
                  required={editingItem || pendingItems.length === 0}
                  className="w-full rounded-md border border-[#304235] bg-[#101713] px-3 py-2 text-[#eaf2ea] outline-none focus:border-[#81aa69]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="item-category">
                  Category
                </label>
                <select
                  id="item-category"
                  value={form.category}
                  onChange={(event) => updateCategory(event.target.value)}
                  className="w-full rounded-md border border-[#304235] bg-[#101713] px-3 py-2 text-[#eaf2ea] outline-none focus:border-[#81aa69]"
                >
                  {CATEGORIES.filter((category) => category.value !== 'all').map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="resource-type">
                  Supply Type
                </label>
                <select
                  id="resource-type"
                  value={selectedResource.value}
                  onChange={(event) => updateResource(event.target.value)}
                  className="w-full rounded-md border border-[#304235] bg-[#101713] px-3 py-2 text-[#eaf2ea] outline-none focus:border-[#81aa69]"
                >
                  {resources.map((resource) => (
                    <option key={resource.value} value={resource.value}>{resource.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium" htmlFor="item-quantity">
                    Quantity
                  </label>
                  <input
                    id="item-quantity"
                    type="number"
                    min="0.01"
                    step="any"
                    value={form.quantity}
                    onChange={(event) => updateForm('quantity', event.target.value)}
                    required
                    className="w-full rounded-md border border-[#304235] bg-[#101713] px-3 py-2 text-[#eaf2ea] outline-none focus:border-[#81aa69]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium" htmlFor="item-unit">
                    Unit
                  </label>
                  <select
                    id="item-unit"
                    value={form.unit}
                    onChange={(event) => updateForm('unit', event.target.value)}
                    className="w-full rounded-md border border-[#304235] bg-[#101713] px-3 py-2 text-[#eaf2ea] outline-none focus:border-[#81aa69]"
                  >
                    {selectedResource.units.map((unit) => (
                      <option key={unit} value={unit}>{UNIT_LABELS[unit]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {form.resourceType === 'drink' && (
                <label className="flex items-center gap-2 text-sm text-[#c5d4c5]">
                  <input
                    type="checkbox"
                    checked={form.shelfStable}
                    onChange={(event) => updateForm('shelfStable', event.target.checked)}
                  />
                  Shelf-stable (does not require refrigeration)
                </label>
              )}
              {!editingItem && (
              <div className="space-y-2">
                {pendingItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {item.name} ({item.quantity} {item.unit})
                    </span>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() =>
                        setPendingItems((current) =>
                          current.filter((_, i) => i !== index)
                        )
                      }
                      className="text-[#f1bbb5]"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleAddAnother}
                  className="rounded-md border border-[#81aa69] px-4 py-2 text-sm text-[#b6db8a]"
                >
                  + Add Another Item
                </button>
              </div>
            )}



              </div>
)}
              {formError && (
                <p className="rounded-md border border-[#87524a] bg-[#372321] p-3 text-sm text-[#f1bbb5]" role="alert">
                  {formError}
                </p>
              )}
              {(editingItem || addMode === 'manual') && (
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="rounded-md border border-[#304235] px-4 py-2 text-sm text-[#b5c6b7] hover:bg-[#304235]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-md bg-[#b6db8a] px-4 py-2 text-sm font-semibold text-[#101713] hover:bg-[#c9eca0] disabled:opacity-60"
                >
                  {isSaving
                  ? 'Saving…'
                  : editingItem
                    ? 'Save Changes'
                    : pendingItems.length > 0
                      ? 'Save All Items'
                      : 'Save Item'}
                </button>
              </div>
              )}
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
