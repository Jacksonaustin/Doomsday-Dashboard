import { useCallback, useEffect, useMemo, useState } from 'react'
import useAuth from '../context/useAuth.js'
import {
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItems,
  updateInventoryItem,
} from '../services/api.js'

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
  food: [{ value: 'meal', label: 'Meals', units: ['meals'] }],
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
  const { refreshSession } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
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
    const result = await getInventoryItems()
    return result.data.items
  }, [])

  const loadItems = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')

    try {
      setItems(await fetchItems())
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

    fetchItems()
      .then((loadedItems) => {
        if (active) {
          setItems(loadedItems)
        }
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

    return () => {
      active = false
    }
  }, [fetchItems, refreshSession])

  const visibleItems = items.filter(
    (item) => selectedCategory === 'all' || item.category === selectedCategory,
  )

  function openAddModal() {
    const category = selectedCategory === 'all' ? 'food' : selectedCategory
    const defaultResource = CATEGORY_RESOURCES[category][0]
    setEditingItem(null)
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

  async function handleSubmit(event) {
    event.preventDefault()
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
      const result = editingItem
        ? await updateInventoryItem(editingItem.id, itemData)
        : await createInventoryItem(itemData)
      const savedItem = result.data.item

      setItems((current) =>
        editingItem
          ? current.map((item) => (item.id === savedItem.id ? savedItem : item))
          : [savedItem, ...current],
      )
      setNotice(editingItem ? 'Inventory item updated.' : 'Inventory item added.')
      setIsModalOpen(false)
      setEditingItem(null)
    } catch (error) {
      if (error.response?.status === 401) {
        await refreshSession()
      } else {
        setFormError(getErrorMessage(error))
      }
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
      await deleteInventoryItem(item.id)
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
        <h1 className="text-3xl font-bold">Inventory</h1>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-dialog-title"
            className="my-auto w-full max-w-md rounded-xl border border-[#304235] bg-[#18231c] p-6 shadow-2xl"
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
                  required
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

              {formError && (
                <p className="rounded-md border border-[#87524a] bg-[#372321] p-3 text-sm text-[#f1bbb5]" role="alert">
                  {formError}
                </p>
              )}

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
                  {isSaving ? 'Saving…' : editingItem ? 'Save Changes' : 'Save Item'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
