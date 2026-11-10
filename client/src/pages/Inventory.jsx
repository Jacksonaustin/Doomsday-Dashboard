
import { useState } from "react"

// Categories displayed in the inventory sidebar
const categories = [
  "All Supplies",
  "Liquids",
  "Food",
  "Medical",
  "Power",
  "Shelter",
  "Tools",
  "Hygiene",
  "Other"
]

export default function InventoryPage() {
  // Tracks the currently selected inventory category
  const [selectedCategory, setSelectedCategory] = useState("All Supplies")

  // Controls whether the Add Item popup is visible
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Temporary inventory storage until the backend is connected
  const [items, setItems] = useState([])

  // For adding items to the inventory :D
  const [itemName, setItemName] = useState("")
  const [itemQuantity, setItemQuantity] = useState("1")
  const [itemUnit, setItemUnit] = useState("pieces")
  const [itemCategory, setItemCategory] = useState("Food")

  // Open the popup and select the current category
  function openAddModal() {
    setItemCategory(
      selectedCategory === "All Supplies" ? "Food" : selectedCategory
    )

    setIsAddModalOpen(true)
  }

  // Close the popup and reset the form
  function closeAddModal() {
    setIsAddModalOpen(false)
    setItemName("")
    setItemQuantity("1")
    setItemUnit("pieces")
    setItemCategory("Food")
  }

  // Temporarily save the item in React state
  function handleAddItem(event) {
    event.preventDefault()

    const name = itemName.trim()
    const quantity = Number(itemQuantity)

    // Validate the item before saving
    if (!name || !Number.isFinite(quantity) || quantity <= 0) {
      return
    }

    const newItem = {
      id: crypto.randomUUID(),
      name: name,
      quantity: quantity,
      unit: itemUnit,
      category: itemCategory
    }

    setItems((previousItems) => [...previousItems, newItem])

    closeAddModal()
  }

  // Only display items belonging to the selected category
  const visibleItems = items.filter(
    (item) =>
      selectedCategory === "All Supplies" ||
      item.category === selectedCategory
  )

  return (
    <main className="min-h-screen bg-[#101713] text-[#eaf2ea]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-bold">Inventory</h1>

        <p className="mt-2 text-[#b5c6b7]">
          Your household supplies will appear here.
        </p>

        {/* Inventory layout */}
        <div className="mt-8 flex flex-col gap-6 md:flex-row">

          {/* Category sidebar */}
          <aside className="w-full rounded-xl border border-[#304235] bg-[#18231c] p-4 md:w-56">
            <h2 className="font-semibold">Categories</h2>

            <ul className="mt-4 space-y-2">
              {categories.map((category) => (
                <li key={category}>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    aria-pressed={selectedCategory === category}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      selectedCategory === category
                        ? "border-[#81aa69] bg-[#304235] font-semibold text-[#eaf2ea]"
                        : "border-transparent text-[#b5c6b7] hover:bg-[#304235]"
                    }`}
                  >
                    {category}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* Main inventory area */}
          <section className="min-h-80 flex-1 rounded-xl border border-[#304235] bg-[#18231c] p-6">

            {/* Inventory heading and Add Item button */}
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">
                {selectedCategory}
              </h2>

              <button
                type="button"
                onClick={openAddModal}
                className="rounded-md bg-[#b6db8a] px-4 py-2 text-sm font-semibold text-[#101713] transition-colors hover:bg-[#c9eca0]"
              >
                + Add Item
              </button>
            </div>

            {/* Display inventory items */}
            {visibleItems.length === 0 ? (
              <p className="mt-3 text-sm text-[#b5c6b7]">
                No supplies added yet.
              </p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[#304235] text-[#b5c6b7]">
                    <tr>
                      <th className="px-3 py-3">Item</th>
                      <th className="px-3 py-3">Quantity</th>
                      <th className="px-3 py-3">Unit</th>
                      <th className="px-3 py-3">Category</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-[#304235]"
                      >
                        <td className="px-3 py-3">{item.name}</td>
                        <td className="px-3 py-3">{item.quantity}</td>
                        <td className="px-3 py-3">{item.unit}</td>
                        <td className="px-3 py-3">{item.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Add Item popup */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-item-title"
            className="w-full max-w-md rounded-xl border border-[#304235] bg-[#18231c] p-6 shadow-2xl"
          >

            {/* Popup heading and close button */}
            <div className="flex items-center justify-between gap-4">
              <h2
                id="add-item-title"
                className="text-xl font-semibold"
              >
                Add Inventory Item
              </h2>

              <button
                type="button"
                onClick={closeAddModal}
                aria-label="Close popup"
                className="rounded-md px-2 py-1 text-[#b5c6b7] hover:bg-[#304235] hover:text-white"
              >
                X
              </button>
            </div>

            {/* Add Item form */}
            <form onSubmit={handleAddItem}>

              {/* Item name input field */}
              <div className="mt-6">
                <label
                  htmlFor="item-name"
                  className="mb-2 block text-sm font-medium"
                >
                  Item Name
                </label>

                <input
                  id="item-name"
                  type="text"
                  placeholder="Enter item name"
                  value={itemName}
                  onChange={(event) => setItemName(event.target.value)}
                  required
                  className="w-full rounded-md border border-[#304235] bg-[#101713] px-3 py-2 text-[#eaf2ea] outline-none focus:border-[#81aa69]"
                />
              </div>

              {/* Quantity input field */}
              <div className="mt-4">
                <label
                  htmlFor="item-quantity"
                  className="mb-2 block text-sm font-medium"
                >
                  Quantity
                </label>

                <input
                  id="item-quantity"
                  type="number"
                  min="0.01"
                  step="any"
                  value={itemQuantity}
                  onChange={(event) => setItemQuantity(event.target.value)}
                  required
                  className="w-full rounded-md border border-[#304235] bg-[#101713] px-3 py-2 text-[#eaf2ea] outline-none focus:border-[#81aa69]"
                />
              </div>

              {/* Unit input field */}
              <div className="mt-4">
                <label
                  htmlFor="item-unit"
                  className="mb-2 block text-sm font-medium"
                >
                  Unit
                </label>

                <select
                  id="item-unit"
                  value={itemUnit}
                  onChange={(event) => setItemUnit(event.target.value)}
                  className="w-full rounded-md border border-[#304235] bg-[#101713] px-3 py-2 text-[#eaf2ea] outline-none focus:border-[#81aa69]"
                >
                  <option value="pieces">Pieces</option>
                  <option value="gallons">Gallons</option>
                  <option value="liters">Liters</option>
                  <option value="pounds">Pounds</option>
                  <option value="ounces">Ounces (weight)</option>
                  <option value="fluid_ounces">Fluid Ounces (volume)</option>
                </select>
              </div>

              {/* Category input field */}
              <div className="mt-4">
                <label
                  htmlFor="item-category"
                  className="mb-2 block text-sm font-medium"
                >
                  Category
                </label>

                <select
                  id="item-category"
                  value={itemCategory}
                  onChange={(event) => setItemCategory(event.target.value)}
                  className="w-full rounded-md border border-[#304235] bg-[#101713] px-3 py-2 text-[#eaf2ea] outline-none focus:border-[#81aa69]"
                >
                  {categories
                    .filter((category) => category !== "All Supplies")
                    .map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                </select>
              </div>

              {/* Cancel and Save buttons */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="rounded-md border border-[#304235] px-4 py-2 text-sm text-[#b5c6b7] hover:bg-[#304235]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-md bg-[#b6db8a] px-4 py-2 text-sm font-semibold text-[#101713] hover:bg-[#c9eca0]"
                >
                  Save Item
                </button>
              </div>

            </form>






          </div>
        </div>
      )}







      
    </main>
  )
}
