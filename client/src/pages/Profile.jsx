
import { useState } from 'react'
import useAuth from '../context/useAuth.js'

export default function ProfilePage() {
  const { user } = useAuth()

  // Temporary household data for frontend development
  const [household, setHousehold] = useState({
    adults: 2,
    children: 1,
    infants: 1,
    pets: 1
  })

  // Calculate total people (pets are excluded)
  const totalPeople =
    household.adults + household.children + household.infants

  // Increase or decrease a household category
  function updateHousehold(category, change) {
    setHousehold((current) => ({
      ...current,
      [category]: Math.max(0, current[category] + change)
    }))
  }

  return (
    <main className="min-h-screen bg-[#101713] text-[#eaf2ea]">
      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* Page heading */}
        <h1 className="text-3xl font-bold">
          My Profile
        </h1>

        <p className="mt-2 text-[#b5c6b7]">
          Manage your account and household information.
        </p>

        {/* Profile overview layout */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">

          {/* Account information */}
          <section className="rounded-xl border border-[#304235] bg-[#18231c] p-6">
            <h2 className="text-xl font-semibold">
              Account Information
            </h2>

            {/* Logged-in user details */}
            <div className="mt-6 flex items-center gap-4">

              {/* Profile avatar */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#304235] text-lg font-bold text-[#b6db8a]">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>

              {/* Account name and email */}
              <div>
                <p className="font-semibold">
                  {user?.name || 'Account Owner'}
                </p>

                <p className="mt-1 text-sm text-[#b5c6b7]">
                  {user?.email || 'Email not available'}
                </p>
              </div>

            </div>
          </section>

          {/* Household overview */}
          <section className="rounded-xl border border-[#304235] bg-[#18231c] p-6">
            <h2 className="text-xl font-semibold">
              Household Overview
            </h2>

            {/* Total household members */}
            <div className="mt-6 rounded-lg bg-[#243329] p-4 text-center">
              <p className="text-3xl font-bold text-[#b6db8a]">
                {totalPeople}
              </p>

              <p className="mt-1 text-sm text-[#b5c6b7]">
                Total People
              </p>
            </div>

            {/* Household category breakdown */}
            <div className="mt-3 grid grid-cols-3 gap-3">

              {/* Adults */}
              <div className="rounded-lg bg-[#243329] p-4 text-center">
                <p className="text-2xl font-bold text-[#b6db8a]">
                  {household.adults}
                </p>

                <p className="mt-1 text-sm text-[#b5c6b7]">
                  Adults
                </p>
              </div>

              {/* Children */}
              <div className="rounded-lg bg-[#243329] p-4 text-center">
                <p className="text-2xl font-bold text-[#b6db8a]">
                  {household.children}
                </p>

                <p className="mt-1 text-sm text-[#b5c6b7]">
                  Children
                </p>
              </div>

              {/* Infants */}
              <div className="rounded-lg bg-[#243329] p-4 text-center">
                <p className="text-2xl font-bold text-[#b6db8a]">
                  {household.infants}
                </p>

                <p className="mt-1 text-sm text-[#b5c6b7]">
                  Infants
                </p>
              </div>

            </div>
          </section>
        </div>

        {/* Household composition */}
        <section className="mt-6 rounded-xl border border-[#304235] bg-[#18231c] p-6">
          <h2 className="text-xl font-semibold">
            Household Composition
          </h2>

          <p className="mt-2 text-sm text-[#b5c6b7]">
            Adjust the number of people in your household.
          </p>

          {/* Household counters */}
          <div className="mt-6 space-y-3">
            {[
              { key: 'adults', label: 'Adults' },
              { key: 'children', label: 'Children' },
              { key: 'infants', label: 'Infants' }
            ].map((category) => (
              <div
                key={category.key}
                className="flex items-center justify-between rounded-xl border border-[#304235] bg-[#101713] p-4"
              >
                <span className="font-medium">
                  {category.label}
                </span>

                <div className="flex items-center gap-4">

                  {/* Decrease count */}
                  <button
                    type="button"
                    onClick={() => updateHousehold(category.key, -1)}
                    disabled={household[category.key] === 0}
                    aria-label={`Decrease ${category.label}`}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#405a45] text-xl hover:bg-[#304235] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    -
                  </button>

                  {/* Current count */}
                  <span className="min-w-8 text-center text-xl font-semibold">
                    {household[category.key]}
                  </span>

                  {/* Increase count */}
                  <button
                    type="button"
                    onClick={() => updateHousehold(category.key, 1)}
                    aria-label={`Increase ${category.label}`}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#405a45] text-xl hover:bg-[#304235]"
                  >
                    +
                  </button>

                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pets section */}
        <section className="mt-6 rounded-xl border border-[#304235] bg-[#18231c] p-6">
          <h2 className="text-xl font-semibold">
            Pets
          </h2>

          <p className="mt-2 text-sm text-[#b5c6b7]">
            Include pets in your household preparedness planning.
          </p>

          {/* Pet counter */}
          <div className="mt-6 flex items-center justify-between rounded-xl border border-[#304235] bg-[#101713] p-4">
            <span className="font-medium">
              Number of Pets
            </span>

            <div className="flex items-center gap-4">

              {/* Decrease pets */}
              <button
                type="button"
                onClick={() => updateHousehold('pets', -1)}
                disabled={household.pets === 0}
                aria-label="Decrease pets"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#405a45] text-xl hover:bg-[#304235] disabled:cursor-not-allowed disabled:opacity-40"
              >
                -
              </button>

              {/* Current pet count */}
              <span className="min-w-8 text-center text-xl font-semibold">
                {household.pets}
              </span>

              {/* Increase pets */}
              <button
                type="button"
                onClick={() => updateHousehold('pets', 1)}
                aria-label="Increase pets"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#405a45] text-xl hover:bg-[#304235]"
              >
                +
              </button>

            </div>
          </div>
        </section>

      </div>
    </main>
  )
}
