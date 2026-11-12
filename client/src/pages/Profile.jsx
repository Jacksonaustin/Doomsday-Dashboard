import { useState } from 'react'
import useAuth from '../context/useAuth.js'

export default function ProfilePage() {
  const { user } = useAuth()

  // Temporary household data for the frontend
  const [household] = useState({
    adults: 2,
    children: 1,
    infants: 1,
    pets: 1
  })

  // Calculate the number of people in the household
  const totalPeople = household.adults + household.children + household.infants

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

            {/* Account actions */}
            <div className="mt-6 flex flex-wrap gap-3 border-t border-[#304235] pt-4">
              <button
                type="button"
                className="cursor-pointer rounded-md border border-[#405a45] px-4 py-2 text-sm font-medium text-[#b6db8a] transition-colors hover:bg-[#304235]"
              >
                Edit Account
              </button>

              <button
                type="button"
                className="cursor-pointer rounded-md border border-[#405a45] px-4 py-2 text-sm font-medium text-[#b6db8a] transition-colors hover:bg-[#304235]"
              >
                Change Password
              </button>
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
      </div>
    </main>
  )
}
