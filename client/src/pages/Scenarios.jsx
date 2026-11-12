import { useState } from "react"
import "./Scenarios.css"

export default function ScenariosPage() {
    const [duration, setDuration] = useState(7)
    const [showResultsLayout, setShowResultsLayout] = useState(false)
  return (
    <main className="min-h-screen bg-[#101713] text-[#eaf2ea]">
      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* Page heading */}
        <h1 className="text-3xl font-bold">
          Disaster Simulation
        </h1>

        <p className="mt-2 text-[#b5c6b7]">
          See how your household supplies hold up during an emergency.
        </p>

        {/* Simulation layout */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">

          {/* Scenario settings panel */}
          <section className="rounded-xl border border-[#304235] bg-[#18231c] p-6">
            <h2 className="text-xl font-semibold">
              Scenario Settings
            </h2>


{/* Selected disaster scenario */}
<div className="mt-6 rounded-lg border border-[#405a45] bg-[#304235] p-4">
  <h3 className="font-semibold text-[#eaf2ea]">
    Extended Power Outage
  </h3>

  <p className="mt-2 text-sm text-[#b5c6b7]">
    Evaluate your household resources during a loss of electricity.
  </p>
</div>

        {/* Simulation duration */}
        <div className="mt-6">
        <div className="flex items-center justify-between">
            <label htmlFor="simulation-duration" className="text-sm font-medium">
            Outage Duration
            </label>

            <span className="font-semibold text-[#b6db8a]">
            {duration} {duration === 1 ? "day" : "days"}
            </span>
        </div>



        <input
            id="simulation-duration"
            type="range"
            min="1"
            max="14"
            step="1"
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value))}
            className="scenario-slider mt-4"
        />
        

        <div className="mt-2 flex justify-between text-xs text-[#b5c6b7]">
            <span>1 day</span>
            <span>14 days</span>
        </div>
                {/* Run Simulation button */}
        <button
        type="button"
        onClick={() => setShowResultsLayout(true)}
        className="mt-6 w-full rounded-md bg-[#b6db8a] px-4 py-3 text-sm font-semibold text-[#101713] transition-colors hover:bg-[#c9eca0]"
        >
        Run Simulation
        </button>
        </div>

          </section>


{/* Simulation results panel */}
<section className="min-h-80 rounded-xl border border-[#304235] bg-[#18231c] p-6">
  <h2 className="text-xl font-semibold">
    Simulation Results
  </h2>

    {/* Simulation results */}
    {showResultsLayout ? (
        <div className="mt-6 space-y-4">

        <p className="text-xs text-[#b5c6b7]">
            Results layout preview - backend integration pending.
        </p>

        {/* Resource coverage */}
        <div className="rounded-lg border border-[#304235] bg-[#101713] p-4">
            <h3 className="font-semibold">Resource Coverage</h3>

            <p className="mt-2 text-sm text-[#b5c6b7]">
            Your household resource coverage will appear here.
            </p>
        </div>

        {/* Identified shortages */}
        <div className="rounded-lg border border-[#304235] bg-[#101713] p-4">
            <h3 className="font-semibold">Identified Shortages</h3>

            <p className="mt-2 text-sm text-[#b5c6b7]">
            Resource shortages will appear here after running a simulation.
            </p>
        </div>

        </div>
    ) : (
        <div className="flex min-h-60 flex-col items-center justify-center text-center">
        <h3 className="text-base font-semibold">
            No Simulation Results Yet
        </h3>

        <p className="mt-2 max-w-xs text-sm text-[#b5c6b7]">
            Select a duration and run a simulation to see how your
            household supplies hold up during a power outage.
        </p>
        </div>
    )}
    </section>


        </div>
      </div>
    </main>
  )
}
