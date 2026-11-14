
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getSimulations,
  getRecommendations,
  getInventoryItems,
  getChecklistItems,
  addChecklistItem as saveChecklistItem,
  updateChecklistItem as saveChecklistItemChanges,
  deleteChecklistItem as removeSavedChecklistItem
} from '../services/api.js'

export default function RecommendationsPage() {
  // Saved simulations and inventory
  const [simulations, setSimulations] = useState([])
  const [inventoryItems, setInventoryItems] = useState(null)
  const [selectedSimulationId, setSelectedSimulationId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // AI recommendations
  const [recommendationData, setRecommendationData] = useState(null)
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [recommendationsError, setRecommendationsError] = useState('')
  const [expandedResource, setExpandedResource] = useState(null)

  // Persisted checklist
  const [checklistItems, setChecklistItems] = useState([])
  const [checklistLoading, setChecklistLoading] = useState(true)
  const [checklistError, setChecklistError] = useState('')
  const [checklistActionError, setChecklistActionError] = useState('')
  const [pendingRecommendationId, setPendingRecommendationId] = useState('')
  const [pendingChecklistId, setPendingChecklistId] = useState('')

  const hasInventory = inventoryItems !== null && inventoryItems.length > 0

  // Load the user's inventory and saved simulations
  useEffect(() => {
    let active = true

    async function loadData() {
      try {
        const [simulationResponse, inventoryResponse] = await Promise.all([
          getSimulations(),
          getInventoryItems()
        ])

        if (!active) return

        const results = simulationResponse.data.results
        const items = inventoryResponse.data.items

        setSimulations(results)
        setInventoryItems(items)
        setSelectedSimulationId(results[0]?.id ?? '')
      } catch {
        if (active) {
          setError('Unable to load your preparedness data.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [])

  // Load saved checklist items so they are restored after a page refresh.
  useEffect(() => {
    let active = true

    getChecklistItems()
      .then((response) => {
        if (active) {
          setChecklistItems(response.data.items)
          setChecklistError('')
        }
      })
      .catch(() => {
        if (active) {
          setChecklistError('Unable to load your checklist. Please try again.')
        }
      })
      .finally(() => {
        if (active) {
          setChecklistLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  // Load recommendations for the selected simulation
  useEffect(() => {
    if (!selectedSimulationId || !hasInventory) return

    let active = true

    async function loadRecommendations() {
      setLoadingRecommendations(true)
      setRecommendationsError('')
      setRecommendationData(null)

      try {
        const response = await getRecommendations(selectedSimulationId)

        if (active) {
          setRecommendationData(response.data)
        }
      } catch {
        if (active) {
          setRecommendationsError('Unable to load recommendations.')
        }
      } finally {
        if (active) {
          setLoadingRecommendations(false)
        }
      }
    }

    loadRecommendations()

    return () => {
      active = false
    }
  }, [selectedSimulationId, hasInventory])

  // Save a recommendation to the user's database-backed checklist.
  async function addToChecklist(recommendation, group) {
    setPendingRecommendationId(recommendation.id)
    setChecklistActionError('')

    try {
      const response = await saveChecklistItem({
        recommendationId: recommendation.id,
        title: recommendation.title,
        description: recommendation.explanation,
        category: recommendation.category || '',
        resource: group.resource,
        simulationId: selectedSimulationId
      })
      const savedItem = response.data.item
      setChecklistItems((current) => (
        current.some((item) => item.id === savedItem.id)
          ? current
          : [savedItem, ...current]
      ))
    } catch (requestError) {
      setChecklistActionError(
        requestError.response?.data?.message || 'Unable to save this checklist item.'
      )
    } finally {
      setPendingRecommendationId('')
    }
  }

  // Expand or collapse a resource category
  function toggleResource(resource) {
    setExpandedResource((current) =>
      current === resource ? null : resource
    )
  }

  async function removeChecklistItem(id) {
    setPendingChecklistId(id)
    setChecklistActionError('')

    try {
      await removeSavedChecklistItem(id)
      setChecklistItems((current) => current.filter((item) => item.id !== id))
    } catch (requestError) {
      setChecklistActionError(
        requestError.response?.data?.message || 'Unable to remove this checklist item.'
      )
    } finally {
      setPendingChecklistId('')
    }
  }

  async function toggleChecklistItem(item) {
    setPendingChecklistId(item.id)
    setChecklistActionError('')

    try {
      const response = await saveChecklistItemChanges(item.id, {
        completed: !item.completed
      })
      const updatedItem = response.data.item
      setChecklistItems((current) => current.map((currentItem) => (
        currentItem.id === updatedItem.id ? updatedItem : currentItem
      )))
    } catch (requestError) {
      setChecklistActionError(
        requestError.response?.data?.message || 'Unable to update this checklist item.'
      )
    } finally {
      setPendingChecklistId('')
    }
  }


  return (
    <main className="min-h-screen bg-[#101713] text-[#eaf2ea]">
      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* Page heading */}
        <h1 className="text-3xl font-bold">
          Preparedness Recommendations
        </h1>

        <p className="mt-2 text-[#b5c6b7]">
          Review recommended improvements and track your preparedness goals.
        </p>

        <div className="mt-8 space-y-6">

          {/* AI Recommendations */}
          <section className="rounded-xl border border-[#304235] bg-[#18231c] p-6">
            <h2 className="text-xl font-semibold">
              AI Recommendations
            </h2>

            {loading ? (
              <p className="mt-4 text-sm text-[#b5c6b7]">
                Loading your preparedness data...
              </p>
            ) : error ? (
              <p className="mt-4 text-sm text-red-400">
                {error}
              </p>
            ) : !hasInventory ? (

              /* STATE 1: Empty inventory */
              <div className="mt-5 rounded-xl border border-[#304235] bg-[#101713] p-6">
                <h3 className="text-lg font-semibold">
                  Let's get you prepared!
                </h3>

                <p className="mt-3 text-sm leading-6 text-[#b5c6b7]">
                  Your inventory is currently empty. Add your emergency
                  supplies, then run a new simulation to receive
                  recommendations based on your household's preparedness.
                </p>

                <Link
                  to="/inventory"
                  className="mt-5 inline-block rounded-lg bg-[#b6db8a] px-5 py-2.5 text-sm font-semibold text-[#101713] transition hover:bg-[#c8e9a1]"
                >
                  Go to Inventory
                </Link>
              </div>

            ) : simulations.length === 0 ? (

              /* No saved simulations */
              <div className="mt-5 rounded-xl border border-[#304235] bg-[#101713] p-6">
                <h3 className="font-semibold">
                  No simulations yet
                </h3>

                <p className="mt-2 text-sm text-[#b5c6b7]">
                  Run a disaster simulation to receive preparedness
                  recommendations based on your inventory.
                </p>

                <Link
                  to="/scenarios"
                  className="mt-4 inline-block rounded-lg bg-[#b6db8a] px-4 py-2 text-sm font-semibold text-[#101713] hover:bg-[#c8e9a1]"
                >
                  Go to Scenarios
                </Link>
              </div>

            ) : (

              /* Saved simulations available */
              <div className="mt-5">

                {/* Simulation selection */}
                <label
                  htmlFor="simulation-select"
                  className="block text-sm text-[#b5c6b7]"
                >
                  Select a saved simulation
                </label>

                <select
                  id="simulation-select"
                  value={selectedSimulationId}
                  onChange={(event) => {
                    setSelectedSimulationId(event.target.value)
                    setExpandedResource(null)
                  }}
                  className="mt-2 w-full rounded-lg border border-[#304235] bg-[#101713] p-3 text-[#eaf2ea]"
                >
                  {simulations.map((simulation) => (
                    <option
                      key={simulation.id}
                      value={simulation.id}
                    >
                      {simulation.scenario} - {new Date(simulation.createdAt).toLocaleString()}
                    </option>
                  ))}
                </select>

                {/* Loading recommendations */}
                {loadingRecommendations && (
                  <p className="mt-5 text-sm text-[#b5c6b7]">
                    Loading recommendations...
                  </p>
                )}

                {/* Recommendation error */}
                {recommendationsError && (
                  <p className="mt-5 text-sm text-red-400">
                    {recommendationsError}
                  </p>
                )}

                {/* Recommendation results */}
                {recommendationData && (
                  <div className="mt-6">

                    {recommendationData.source === 'fallback' ? (

                      /* STATE 2: AI unavailable */
                      <div className="space-y-4">

                        <div className="rounded-xl border border-yellow-800/60 bg-yellow-950/20 p-5">
                          <h3 className="font-semibold text-yellow-200">
                            AI recommendations temporarily unavailable
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-[#b5c6b7]">
                            Your simulation identified shortages, but
                            personalized recommendations couldn't be loaded.
                            You can still review which resources need attention.
                          </p>
                        </div>

                        {/* Compact shortage summary */}
                        <div className="rounded-xl border border-[#304235] bg-[#101713] p-5">
                          <h3 className="font-semibold">
                            Identified Shortages
                          </h3>

                          <p className="mt-1 text-sm text-[#b5c6b7]">
                            {recommendationData.results.length} resource areas need attention.
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {recommendationData.results.map((group) => (
                              <div
                                key={group.resource}
                                className="rounded-lg border border-[#304235] bg-[#243329] px-3 py-2"
                              >
                                <span className="text-sm font-medium capitalize text-[#eaf2ea]">
                                  {group.resource.replaceAll('_', ' ')}
                                </span>

                                <span className="ml-2 text-xs capitalize text-[#b6db8a]">
                                  {group.severity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                    ) : recommendationData.results.length === 0 ? (

                      /* No shortages */
                      <div className="rounded-xl border border-[#304235] bg-[#101713] p-5">
                        <h3 className="font-semibold text-[#b6db8a]">
                          No shortages identified
                        </h3>

                        <p className="mt-2 text-sm text-[#b5c6b7]">
                          This simulation didn't identify any resource shortages.
                        </p>
                      </div>

                    ) : (

                      /* STATE 3: Actual AI recommendations */
                      <div className="space-y-3">

                        <p className="mb-4 text-sm text-[#b5c6b7]">
                          Select a resource category to view recommendations
                          and choose which ones to add to your checklist.
                        </p>

                        {recommendationData.results.map((group) => {
                          const isExpanded = expandedResource === group.resource

                          return (
                            <div
                              key={group.resource}
                              className="rounded-xl border border-[#304235] bg-[#101713] p-4"
                            >

                              {/* Collapsible category heading */}
                              <button
                                type="button"
                                onClick={() => toggleResource(group.resource)}
                                aria-expanded={isExpanded}
                                className="flex w-full items-center justify-between gap-3 text-left"
                              >
                                <div className="flex flex-wrap items-center gap-3">
                                  <h3 className="font-semibold capitalize">
                                    {group.resource.replaceAll('_', ' ')}
                                  </h3>

                                  <span className="text-xs text-[#b5c6b7]">
                                    {group.recommendations?.length ?? 0} recommendations
                                  </span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="rounded-md bg-[#304235] px-3 py-1 text-xs capitalize text-[#b6db8a]">
                                    {group.severity}
                                  </span>

                                  <span
                                    className="text-xl text-[#b6db8a]"
                                    aria-hidden="true"
                                  >
                                    {isExpanded ? '−' : '+'}
                                  </span>
                                </div>
                              </button>

                              {/* Show cards only when expanded */}
                              {isExpanded && (
                                <div className="mt-4 space-y-3">

                                  {(group.recommendations ?? []).length === 0 ? (
                                    <p className="text-sm text-[#b5c6b7]">
                                      No specific recommendations available.
                                    </p>
                                  ) : (
                                    group.recommendations.map((recommendation) => {
                                      const alreadyAdded = checklistItems.some(
                                        (item) => item.recommendationId === recommendation.id
                                      )
                                      const isAdding = pendingRecommendationId === recommendation.id

                                      return (
                                        <article
                                          key={recommendation.id}
                                          className="rounded-lg border border-[#304235] bg-[#18231c] p-4"
                                        >
                                          <h4 className="font-medium text-[#eaf2ea]">
                                            {recommendation.title}
                                          </h4>

                                          <p className="mt-2 text-sm leading-6 text-[#b5c6b7]">
                                            {recommendation.explanation}
                                          </p>

                                          <button
                                            type="button"
                                            onClick={() => addToChecklist(recommendation, group)}
                                            disabled={alreadyAdded || isAdding}
                                            className="mt-4 rounded-lg bg-[#b6db8a] px-4 py-2 text-sm font-semibold text-[#101713] transition hover:bg-[#c8e9a1] disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            {isAdding
                                              ? 'Saving…'
                                              : alreadyAdded
                                              ? 'Added to Checklist'
                                              : '+ Add to Checklist'}
                                          </button>
                                        </article>
                                      )
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Backend advisory */}
                    {recommendationData.advisory && (
                      <p className="mt-5 text-xs text-[#b5c6b7]">
                        {recommendationData.advisory}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Preparedness Checklist */}
          <section className="rounded-xl border border-[#304235] bg-[#18231c] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">
                My Preparedness Checklist
              </h2>

              <span className="text-sm text-[#b5c6b7]">
                {checklistItems.length} items
              </span>
            </div>

            {checklistActionError && (
              <p className="mt-4 text-sm text-red-400" role="alert">
                {checklistActionError}
              </p>
            )}

            {checklistLoading ? (
              <p className="mt-4 text-sm text-[#b5c6b7]" role="status">
                Loading your checklist…
              </p>
            ) : checklistError ? (
              <p className="mt-4 text-sm text-red-400" role="alert">
                {checklistError}
              </p>
            ) : checklistItems.length === 0 ? (
              <p className="mt-4 text-sm text-[#b5c6b7]">
                No checklist items added yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-lg border border-[#304235] bg-[#101713] p-4 ${
                      item.completed ? 'opacity-70' : ''
                    }`}
                  >
                    <h3 className={`font-medium ${item.completed ? 'line-through' : ''}`}>
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm text-[#b5c6b7]">
                      {item.description}
                    </p>

                    <span className="mt-3 inline-block rounded-md bg-[#243329] px-2 py-1 text-xs capitalize text-[#b6db8a]">
                      {item.resource.replaceAll('_', ' ')}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleChecklistItem(item)}
                      disabled={pendingChecklistId === item.id}
                      className="ml-3 rounded-lg border border-[#304235] px-3 py-1.5 text-xs text-[#b6db8a] transition hover:bg-[#243329] disabled:opacity-50"
                    >
                      {pendingChecklistId === item.id
                        ? 'Saving…'
                        : item.completed
                          ? 'Mark incomplete'
                          : 'Mark complete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(item.id)}
                      disabled={pendingChecklistId === item.id}
                      className="ml-2 rounded-lg border border-[#304235] px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-950/30 disabled:opacity-50"
                    >
                      Remove
                    </button>

                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </main>
  )
}
