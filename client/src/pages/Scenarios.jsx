import { useEffect, useState } from 'react'
import './Scenarios.css'
import { getSimulationScenarios, runSimulation } from '../services/api.js'

export default function ScenariosPage() {
    const [duration, setDuration] = useState(14)
    const [scenarios, setScenarios] = useState([])
    const [selectedScenario, setSelectedScenario] = useState('powerOutage')
    const [scenariosLoading, setScenariosLoading] = useState(true)
    const [scenariosError, setScenariosError] = useState('')
    const [simulationResult, setSimulationResult] = useState(null)
    const [runningSimulation, setRunningSimulation] = useState(false)
    const [simulationError, setSimulationError] = useState('')
    const currentScenario = scenarios.find(
  (scenario) => scenario.key === selectedScenario
)

      useEffect(() => {
    let active = true

    async function loadScenarios() {
      try {
        const response = await getSimulationScenarios()
        console.log('Available scenarios:', response.data)

        if (active) {
          setScenarios(response.data.scenarios)
          setScenariosError('')
        }
      } catch {
        if (active) {
          setScenariosError('Unable to load disaster scenarios.')
        }
      } finally {
        if (active) {
          setScenariosLoading(false)
        }
      }
    }

    loadScenarios()

    return () => {
      active = false
    }
  }, [])

    async function handleRunSimulation() {
      setRunningSimulation(true)
      setSimulationError('')
      setSimulationResult(null)

      try {
        const response = await runSimulation(selectedScenario, duration)

        setSimulationResult(response.data)
        console.log('Simulation result:', response)
      } catch (error) {
        setSimulationError(
          error.response?.data?.message || 'Unable to run simulation.'
        )
      } finally {
        setRunningSimulation(false)
      }
    }

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
  <label htmlFor="scenario-select" className="block text-sm font-medium">
    Disaster Type
  </label>

  <select
    id="scenario-select"
    value={selectedScenario}
    onChange={(event) => {
      const key = event.target.value
      setSelectedScenario(key)

      const scenario = scenarios.find((item) => item.key === key)
      if (scenario) setDuration(scenario.days)

      setSimulationResult(null)
    }}
    disabled={scenariosLoading || !!scenariosError || runningSimulation}
    className="mt-3 w-full rounded-md border border-[#405a45] bg-[#18231c] px-3 py-2 text-[#eaf2ea]"
  >
    {scenarios.map((scenario) => (
      <option key={scenario.key} value={scenario.key}>
        {scenario.label}
      </option>
    ))}
  </select>

  {scenariosLoading && (
    <p className="mt-2 text-sm text-[#b5c6b7]">Loading disasters...</p>
  )}

  {scenariosError && (
    <p className="mt-2 text-sm text-red-400">{scenariosError}</p>
  )}

  {currentScenario && (
    <p className="mt-3 text-sm text-[#b5c6b7]">
      Default duration: {currentScenario.days} days
    </p>
  )}
</div>


        {/* Simulation duration */}
        <div className="mt-6">
        <div className="flex items-center justify-between">
            <label htmlFor="simulation-duration" className="text-sm font-medium">
            Simulation Duration
            </label>

            
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="365"
              value={duration}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (Number.isInteger(value) && value >= 1 && value <= 365) {
                  setDuration(value)
                }
              }}
              className="w-20 rounded-md border border-[#405a45] bg-[#101713] px-2 py-1 text-right text-[#b6db8a]"
              aria-label="Simulation duration in days"
            />
            <span className="text-sm text-[#b5c6b7]">
              {duration === 1 ? 'day' : 'days'}
            </span>
          </div>

        </div>



        <input
            id="simulation-duration"
            type="range"
            min="1"
            max="365"
            step="1"
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value))}
            className="scenario-slider mt-4"
        />
        


        <div className="mt-2 flex justify-between text-xs text-[#b5c6b7]">
          <span>1 day</span>
          <span>365 days</span>
        </div>

        {/* Run Simulation button */}
        <button
          type="button"
          onClick={handleRunSimulation}
          disabled={runningSimulation || scenariosLoading || !!scenariosError || !currentScenario}
          className="mt-6 w-full rounded-md bg-[#b6db8a] px-4 py-3 text-sm font-semibold text-[#101713] transition-colors hover:bg-[#c9eca0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {runningSimulation ? 'Running Simulation...' : 'Run Simulation'}
        </button>

        {/* Display errors */}
        {simulationError && (
          <p className="mt-3 text-sm text-red-400">
            {simulationError}
          </p>
        )}

        {/* Display success */}
        {simulationResult && (
          <p className="mt-3 text-sm text-[#b6db8a]">
            Simulation completed and saved successfully!
          </p>
        )}

        </div>
        </section>




{/* Simulation results panel */}
<section className="min-h-80 rounded-xl border border-[#304235] bg-[#18231c] p-6">
  <h2 className="text-xl font-semibold">
    Simulation Results
  </h2>

  {simulationResult ? (
    <div className="mt-6 space-y-5">

      {/* Preparedness score */}
      <div className="rounded-lg border border-[#304235] bg-[#101713] p-4">
        <h3 className="text-sm text-[#b5c6b7]">
          Preparedness Score
        </h3>

        <p className="mt-2 text-4xl font-bold text-[#b6db8a]">
          {simulationResult.preparednessScore}/100
        </p>

        <p className="mt-2 text-xs text-[#b5c6b7]">
          For a {simulationResult.days}-day disaster scenario, based on your household supplies.
        </p>
      </div>

      {/* How long supplies last, whatever the outage length */}
      {simulationResult.survival && (
        <div className="rounded-lg border border-[#304235] bg-[#101713] p-4">
          <h3 className="text-sm text-[#b5c6b7]">
            Supplies Last
          </h3>

          <p className="mt-2 text-4xl font-bold text-[#b6db8a]">
            {simulationResult.survival.days} {simulationResult.survival.days === 1 ? 'day' : 'days'}
          </p>

          <p className="mt-2 text-xs capitalize text-[#b5c6b7]">
            Runs out first: {simulationResult.resourceCoverage.find(
              (resource) => resource.resource === simulationResult.survival.limitedBy
            )?.label}
          </p>
        </div>
      )}

      {/* Resource coverage */}
      <div className="rounded-lg border border-[#304235] bg-[#101713] p-4">
        <h3 className="mb-4 font-semibold">
          Resource Coverage
        </h3>

        <div className="space-y-4">
          {simulationResult.resourceCoverage.map((resource) => (
            <div key={resource.resource}>

              <div className="mb-2 flex justify-between gap-3 text-sm">
                <span className="capitalize">
                  {resource.label}
                </span>

                <span className="text-[#b5c6b7]">
                  {Math.round(resource.coverage * 100)}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[#304235]">
                <div
                  className="h-full rounded-full bg-[#b6db8a]"
                  style={{
                    width: `${Math.min(100, Math.max(0, resource.coverage * 100))}%`
                  }}
                />
              </div>

              <p className="mt-1 text-xs text-[#b5c6b7]">
                {resource.have} / {resource.need} {resource.unit}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Identified shortages */}
      <div className="rounded-lg border border-[#304235] bg-[#101713] p-4">
        <h3 className="font-semibold">
          Identified Shortages
        </h3>

        {simulationResult.shortages.length === 0 ? (
          <p className="mt-3 text-sm text-[#b6db8a]">
            No shortages identified!
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {simulationResult.shortages.map((shortage) => (
              <div
                key={shortage.resource}
                className="rounded-lg border border-[#304235] bg-[#18231c] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium capitalize">
                    {shortage.label}
                  </span>

                  <span className="text-xs capitalize text-[#b6db8a]">
                    {shortage.severity}
                  </span>
                </div>

                <p className="mt-2 text-xs text-[#b5c6b7]">
                  Missing {shortage.shortfall} {shortage.unit}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  ) : (
    <div className="flex min-h-60 flex-col items-center justify-center text-center">
      <h3 className="text-base font-semibold">
        No Simulation Results Yet
      </h3>

      <p className="mt-2 max-w-xs text-sm text-[#b5c6b7]">
        Run a simulation to see how your household supplies
        hold up during the selected disaster.
      </p>
    </div>
  )}
</section>



        </div>
      </div>
    </main>
  )
}
