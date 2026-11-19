import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getInventoryItems, getSimulations } from '../services/api.js'
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const CATEGORY_LABELS = {
  liquid: 'Liquids',
  food: 'Food',
  medical: 'Medical',
  power: 'Power',
  shelter: 'Shelter',
  tools: 'Tools',
  hygiene: 'Hygiene',
  other: 'Other',
}

const CHART_COLORS = {
  food: '#91bb7e',
  liquid: '#60a5fa',
  medical: '#f87171',
  power: '#facc15',
  shelter: '#c084fc',
  tools: '#2dd4bf',
  hygiene: '#f59e0b',
  other: '#94a3b8',
}

const WATER_UNITS = {
  gallons: 1,
  liters: 0.264172,
  fluid_ounces: 1 / 128,
}

const formatScenario = (name) => {
  if (!name) return 'Unknown Scenario'

  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase())
}

const formatDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString()
}

const displayDays = (days) =>
  Number.isFinite(days) ? `${days} days` : '—'

const remainingPercent = (daysCovered, day) => {
  if (daysCovered <= 0) return 0
  return Math.max(0, Math.round((1 - day / daysCovered) * 100))
}

export default function OverviewPage() {
  const [items, setItems] = useState([])
  const [simulations, setSimulations] = useState([])
  const [selectedSimulationId, setSelectedSimulationId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadOverview() {
      try {
        const [inventoryResult, simulationResult] = await Promise.all([
          getInventoryItems(),
          getSimulations(),
        ])

        if (!active) return

        setItems(inventoryResult.data.items ?? [])
        setSimulations(simulationResult.data.results ?? [])

      } catch {
        if (active) setError('Unable to load your overview data.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadOverview()
    return () => { active = false }
  }, [])

  const latestSimulation = simulations[0] ?? null

  const categoryCounts = items.reduce((counts, item) => {
    const category = item.category || 'other'
    counts[category] = (counts[category] || 0) + 1
    return counts
  }, {})

  const totalMeals = items
    .filter((item) => item.resourceType === 'meal')
    .reduce((total, item) => total + item.quantity, 0)

  const totalWaterGallons = items
    .filter((item) => item.resourceType === 'water')
    .reduce(
      (total, item) =>
        total + item.quantity * (WATER_UNITS[item.unit] ?? 0),
      0
    )

const chartData = Object.entries(categoryCounts)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([category, count]) => ({
    category,
    name: CATEGORY_LABELS[category] || category,
    value: count,
  }))

  const recentSimulations = simulations.slice(0, 5)
  const selectedSimulation =
    recentSimulations.find((sim) => sim.id === selectedSimulationId)
    ?? recentSimulations[0]
    ?? null

  const selectedCoverage = selectedSimulation?.resourceCoverage ?? []
  const selectedFoodDays = selectedCoverage.find(
    (resource) => resource.resource === 'food'
  )?.daysCovered
  const selectedWaterDays = selectedCoverage.find(
    (resource) => resource.resource === 'drinking_water'
  )?.daysCovered

  const hasCoverage =
    Number.isFinite(selectedFoodDays) && Number.isFinite(selectedWaterDays)
  const chartDuration = Math.max(1, selectedSimulation?.days ?? 1)

  const depletionData = hasCoverage
    ? [...new Set([
        ...Array.from(
          { length: 31 },
          (_, i) => Number(((i * chartDuration) / 30).toFixed(2))
        ),
        selectedFoodDays,
        selectedWaterDays,
      ].filter((day) => day >= 0 && day <= chartDuration))]
        .sort((a, b) => a - b)
        .map((day) => ({
          day,
          food: remainingPercent(selectedFoodDays, day),
          water: remainingPercent(selectedWaterDays, day),
        }))
    : []

  const summaryCards = [
    { label: 'Inventory Entries', value: items.length },
    {
      label: 'Selected Score',
      value: Number.isFinite(selectedSimulation?.preparednessScore)
        ? `${selectedSimulation.preparednessScore}/100`
        : '—',
    },
    {
      label: 'Food Coverage',
      value: displayDays(selectedFoodDays),
      detail: `${totalMeals} meals in current inventory`,
    },
    {
      label: 'Drinking Water',
      value: displayDays(selectedWaterDays),
      detail: `${Number(totalWaterGallons.toFixed(2))} gal of water stored`,
    },
  ]

  return (
    <main className="min-w-0 min-h-screen bg-[#101713] text-[#eaf2ea]">
      <div className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-bold sm:text-3xl">Overview</h1>
        <p className="mt-2 text-sm text-[#b5c6b7] sm:text-base">
          Your emergency preparedness at a glance.
        </p>

        {loading && <p className="mt-6">Loading overview...</p>}
        {error && <p className="mt-6 text-red-400">{error}</p>}

        {!loading && !error && (
          <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-6">
            {/* Summary cards: 1 column on small phones, 2 on larger phones, 4 on desktop. */}
            <section className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4 lg:gap-4">
              {summaryCards.map((stat) => (
                <div
                  key={stat.label}
                  className="min-w-0 rounded-xl border border-[#354839] bg-[#19241c] p-4 sm:p-5"
                >
                  <p className="text-sm text-[#b5c6b7]">{stat.label}</p>
                  <p className="mt-2 break-words text-xl font-bold sm:text-2xl">
                    {stat.value}
                  </p>
                  {stat.detail && (
                    <p className="mt-2 break-words text-xs text-[#91bb7e]">
                      {stat.detail}
                    </p>
                  )}
                </div>
              ))}
            </section>

            {/* Stack charts on phones; show the forecast first and the doughnut second on desktop. */}
            <div
              className={`grid min-w-0 grid-cols-1 items-start gap-4 lg:gap-6 ${
                selectedSimulation
                  ? 'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]'
                  : 'lg:grid-cols-1'
              }`}
            >
              {/* Inventory breakdown */}
              <section className="min-w-0 rounded-xl border border-[#354839] bg-[#19241c] p-4 sm:p-6 lg:order-2">
                <h2 className="text-lg font-semibold sm:text-xl">
                  Inventory Breakdown
                </h2>
                <p className="mt-1 text-sm text-[#b5c6b7]">
                  Number of inventory entries in each category.
                </p>

                {items.length === 0 ? (
                  <div className="mt-8 text-center">
                    <p className="text-[#b5c6b7]">
                      You haven't added any supplies yet.
                    </p>
                    <Link
                      to="/inventory"
                      className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#91bb7e] px-4 py-2 text-center font-semibold text-[#101713]"
                    >
                      Add Your First Supplies
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="relative mx-auto mt-5 h-60 w-full min-w-0 sm:h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={65}
                            outerRadius={100}
                          >
                            {chartData.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={CHART_COLORS[entry.category] ?? CHART_COLORS.other}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold sm:text-3xl">
                          {items.length}
                        </span>
                        <span className="text-xs text-[#b5c6b7]">Entries</span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-2 sm:mt-4 sm:gap-x-4">
                      {chartData.map((category) => (
                        <span
                          key={category.name}
                          className="flex items-center gap-2 text-xs sm:text-sm"
                        >
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{
                                backgroundColor: CHART_COLORS[category.category] ?? CHART_COLORS.other,
                            }}
                          />
                          {category.name}: {category.value}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* Supply depletion forecast */}
              {selectedSimulation && (
                <section className="min-w-0 rounded-xl border border-[#354839] bg-[#19241c] p-4 sm:p-6 lg:order-1">
                  <h2 className="text-lg font-semibold sm:text-xl">
                    Supply Depletion Forecast
                  </h2>
                  <p className="mt-1 text-sm text-[#b5c6b7]">
                    Estimated supplies remaining throughout a disaster.
                  </p>

                  {hasCoverage ? (
                    <>
                      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="min-w-0">
                          <p className="text-xs text-[#b5c6b7] sm:text-sm">
                            Food lasts
                          </p>
                          <p className="mt-1 break-words text-lg font-bold sm:text-xl">
                            {selectedFoodDays} days
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-[#b5c6b7] sm:text-sm">
                            Drinking water lasts
                          </p>
                          <p className="mt-1 break-words text-lg font-bold sm:text-xl">
                            {selectedWaterDays} days
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 h-64 w-full min-w-0 sm:h-72 lg:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={depletionData}
                            margin={{ top: 8, right: 8, left: -14, bottom: 4 }}
                          >
                            <CartesianGrid stroke="#354839" strokeDasharray="3 3" />
                            <XAxis
                              dataKey="day"
                              type="number"
                              domain={[0, 'dataMax']}
                              tickCount={5}
                              tick={{ fill: '#b5c6b7', fontSize: 11 }}
                            />
                            <YAxis
                              width={42}
                              domain={[0, 100]}
                              tickFormatter={(value) => `${value}%`}
                              tick={{ fill: '#b5c6b7', fontSize: 11 }}
                            />
                            <Tooltip
                              labelFormatter={(day) => `Day ${day}`}
                              formatter={(value) => `${value}%`}
                              contentStyle={{
                                backgroundColor: '#18231c',
                                border: '1px solid #354839',
                                color: '#eaf2ea',
                              }}
                            />
                            <Line
                              type="linear"
                              dataKey="food"
                              name="Food remaining"
                              stroke="#91bb7e"
                              strokeWidth={3}
                              dot={false}
                            />
                            <Line
                              type="linear"
                              dataKey="water"
                              name="Drinking water remaining"
                              stroke="#60a5fa"
                              strokeWidth={3}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* A separate legend keeps long labels from squeezing the graph on phones. */}
                      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs sm:text-sm">
                        <span className="flex items-center gap-2">
                          <span className="h-0.5 w-4 bg-[#91bb7e]" />
                          Food remaining
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="h-0.5 w-4 bg-[#60a5fa]" />
                          Drinking water remaining
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="mt-6 text-[#b5c6b7]">
                      Supply coverage estimates are unavailable for this simulation.
                    </p>
                  )}
                </section>
              )}
            </div>

            {/* Recent simulations */}
            {recentSimulations.length > 0 && (
              <section className="rounded-xl border border-[#354839] bg-[#19241c] p-4 sm:p-6">
                <h2 className="text-lg font-semibold sm:text-xl">
                  Recent Simulations
                </h2>
                <p className="mt-1 text-sm text-[#b5c6b7]">
                  Your five most recent simulations. Select one to update the forecast above.
                </p>

                <div className="mt-5 space-y-3">
                  {recentSimulations.map((sim) => {
                    const isSelected = selectedSimulation?.id === sim.id

                    return (
                      <div
                        key={sim.id}
                        className={`flex min-w-0 flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4 ${
                          isSelected
                            ? 'border-[#91bb7e] bg-[#263a2a]'
                            : 'border-[#354839] bg-[#101713]'
                        }`}
                      >
                        <div className="min-w-0">
                          <h3 className="break-words font-semibold">
                            {formatScenario(sim.scenario)}
                          </h3>
                          <p className="mt-1 text-sm text-[#b5c6b7]">
                            {formatDate(sim.createdAt)} · {sim.days} days
                          </p>
                        </div>

                        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:shrink-0 sm:justify-end sm:gap-4">
                          <div className="text-left sm:text-right">
                            <p className="text-lg font-bold">
                              {Number.isFinite(sim.preparednessScore)
                                ? `${sim.preparednessScore}/100`
                                : '—'}
                            </p>
                            <p className="text-xs text-[#b5c6b7]">Preparedness</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedSimulationId(sim.id)}
                            disabled={isSelected}
                            className="min-h-11 shrink-0 whitespace-nowrap rounded-lg border border-[#91bb7e] px-4 py-2 text-sm font-semibold text-[#91bb7e] transition-colors hover:bg-[#304535] disabled:cursor-default disabled:opacity-50"
                          >
                            {isSelected ? 'Selected' : 'View Graph'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Existing no-simulations state; we'll test it in the next batch. */}
            {!latestSimulation && (
              <section className="rounded-xl border border-[#354839] bg-[#19241c] p-5 text-center sm:p-8">
                <h2 className="text-lg font-semibold sm:text-xl">
                  No Simulations Yet
                </h2>
                <p className="mt-2 text-sm text-[#b5c6b7] sm:text-base">
                  Run your first disaster simulation to see your supply depletion forecast.
                </p>
                <Link
                  to="/scenarios"
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#91bb7e] px-5 py-3 text-center font-semibold text-[#101713]"
                >
                  Run Your First Simulation
                </Link>
              </section>
            )}

            {/* Quick actions */}
            <section className="rounded-xl border border-[#354839] bg-[#19241c] p-4 sm:p-6">
              <h2 className="text-lg font-semibold sm:text-xl">
                Quick Actions
              </h2>
              <p className="mt-1 text-sm text-[#b5c6b7]">
                Keep your emergency preparedness up to date.
              </p>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <Link
                  to="/inventory"
                  className="flex min-h-12 items-center justify-center rounded-lg border border-[#91bb7e] bg-[#263a2a] px-5 py-4 text-center font-semibold text-[#d7f2ce] transition-colors hover:bg-[#36553b]"
                >
                  Add Inventory
                </Link>
                <Link
                  to="/scenarios"
                  className="flex min-h-12 items-center justify-center rounded-lg border border-[#91bb7e] bg-[#263a2a] px-5 py-4 text-center font-semibold text-[#d7f2ce] transition-colors hover:bg-[#36553b]"
                >
                  Run New Simulation
                </Link>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
