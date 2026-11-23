const { RESOURCE_TYPES } = require('../config/resourceTypes');

const AI_TIMEOUT = 3000; // the form is waiting on this, so give up sooner than recommendations do

// Asks the AI service what a typed item is, so the inventory form can prefill it.
// Never throws for an AI problem: the form still works by hand, so we just say
// we couldn't guess.
async function classifyFood(name) {
  const baseURL = process.env.AI_SERVICE_URL;
  if (!baseURL) {
    return { source: 'unavailable', matched: false };
  }

  let data;
  try {
    const response = await fetch(new URL('/food/classify', baseURL), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
      signal: AbortSignal.timeout(AI_TIMEOUT)
    });
    if (!response.ok) {
      throw new Error(`AI service responded with status ${response.status}`);
    }
    data = (await response.json())?.data;
    if (typeof data?.matched !== 'boolean') {
      throw new Error('AI service returned invalid data format');
    }
  } catch (error) {
    console.error('Food classifier unavailable:', error.message);
    return { source: 'unavailable', matched: false };
  }

  return { source: 'ai', ...data, suggestion: toSuggestion(data) };
}

// What the form can drop straight into its fields. Only types this backend accepts
// are suggested, so a rename on the Python side can't prefill an invalid item.
function toSuggestion(data) {
  const type = data.matched ? RESOURCE_TYPES[data.resourceType] : undefined;
  if (!type) return null;

  return {
    resourceType: data.resourceType,
    category: type.category,
    unit: type.baseUnit,
    // Meals can be worked out from "6 cans". Infant and pet food are counted in
    // days, which the user has to judge, so leave that blank.
    quantity: type.baseUnit === 'meals' ? data.estimatedMeals ?? data.quantity ?? null : null,
    expiresInDays: data.shelfLifeDays ?? null
  };
}

module.exports = { classifyFood };
