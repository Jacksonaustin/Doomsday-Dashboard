
import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <main className="bg-[#101713] text-[#eaf2ea]">

      {/* Main introduction */}
      <section className="border-b border-[#334337]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <h1 className="mb-5 text-4xl font-bold md:text-5xl">
            Prepare for the END
          </h1>

          <p className="mb-8 max-w-2xl text-lg text-[#b5c6b7]">
            Manage your supplies, track your resources, and prepare
            your household for emergencies with Doomsday Dashboard.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/register"
              className="rounded-md bg-[#91bb7e] px-6 py-3 font-semibold text-[#101713] hover:bg-[#aad19a]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Main features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-8 text-2xl font-semibold">
          Features
        </h2>

        <div className="grid gap-5 md:grid-cols-3">

          {/* Inventory Management */}
          <div className="rounded-lg border border-[#354839] bg-[#1e2b22] p-6">
            <h3 className="mb-3 text-lg font-semibold">
              Inventory Management
            </h3>

            <p className="text-[#b5c6b7]">
              Keep track of your food, water, medical supplies, and equipment.
            </p>
          </div>

          {/* Resource Analysis */}
          <div className="rounded-lg border border-[#354839] bg-[#1e2b22] p-6">
            <h3 className="mb-3 text-lg font-semibold">
              Resource Analysis
            </h3>

            <p className="text-[#b5c6b7]">
              See how long your supplies could last and identify shortages.
            </p>
          </div>

          {/* Recommendations */}
          <div className="rounded-lg border border-[#354839] bg-[#1e2b22] p-6">
            <h3 className="mb-3 text-lg font-semibold">
              Recommendations
            </h3>

            <p className="text-[#b5c6b7]">
              Get suggestions based on your inventory and household needs.
            </p>
          </div>

        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-[#19241c]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="mb-4 text-2xl font-semibold">
            How It Works!
          </h2>

          <p className="max-w-2xl leading-7 text-[#b5c6b7]">
            Create an account, enter your household information,
            and start adding supplies to your inventory.
            Doomsday Dashboard is designed to help you understand
            your resources and make better preparation decisions.
          </p>
        </div>
      </section>

    </main>
  )
}
