
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

  const [itemName, setItemName] = useState("")

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
                onClick={() => setIsAddModalOpen(true)}
                className="rounded-md bg-[#b6db8a] px-4 py-2 text-sm font-semibold text-[#101713] transition-colors hover:bg-[#c9eca0]"
              >
                + Add Item
              </button>
            </div>

            {/* Temporary empty inventory message */}
            <p className="mt-3 text-sm text-[#b5c6b7]">
              No supplies added yet.
            </p>
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
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close popup"
                className="rounded-md px-2 py-1 text-[#b5c6b7] hover:bg-[#304235] hover:text-white"
              >
                X
              </button>
            </div>

            {/* Item form will be added here */}
            <p className="mt-4 text-sm text-[#b5c6b7]">
              Item form will go here.
            </p>

          </div>
        </div>
      )}
    </main>
  )
}
