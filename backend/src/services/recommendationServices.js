const { getResult } = require('./simulationServices');

const AI_TIMEOUT = 5000; // 5 seconds
const MAX_SHORTAGES = 20; // the AI service accepts up to 20

const ADVISORY = 'Recommendations are suggestions only and may not fit every household.';

// Shown when the AI service is down, so recommendations never break the app.
const GENERIC_MESSAGE = {
  id: 'generic-kit',
  category: 'general',
  title: 'Review your basic emergency kit',
  explanation:
    'Check that you have water, food, medication, a flashlight, a radio and first aid ' +
    'supplies for every person in your household. Ready.gov has a full checklist.',
  confidence: null
};

async function fetchFromAiService(shortages) {
  const baseURL = process.env.AI_SERVICE_URL;
  if (!baseURL) {
    throw new Error('AI_SERVICE_URL is not set');
  }

  const response = await fetch(new URL('/recommendations', baseURL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shortages: shortages
        .slice(0, MAX_SHORTAGES)
        .map(({ resource, severity, description }) => ({ resource, severity, description }))
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT)
  });

  if (!response.ok) {
    throw new Error(`AI service responded with status ${response.status}`);
  }

  const body = await response.json();
  if (!Array.isArray(body?.data?.results)) {
    throw new Error('AI service returned invalid data format');
  }
  return body.data;
}

function getGenericMessage(shortages) {
  return shortages.map(({ resource, severity }) => ({
    resource,
    severity,
    matched: false,
    lowConfidence: true,
    recommendations: [GENERIC_MESSAGE]
  }));
}

async function getRecommendations(userId, resultId) {
  // getResult returns 404 for other users' results, so ownership is checked here.
  const result = await getResult(userId, resultId);

  if (result.shortages.length === 0) {
    return { source: 'none', method: null, advisory: ADVISORY, results: [] };
  }

  try {
    const data = await fetchFromAiService(result.shortages);
    return { source: 'ai', method: data.method, advisory: ADVISORY, results: data.results };
  } catch (error) {
    console.error('AI service unavailable, using generic advice:', error.message);
    return { source: 'fallback', method: null, advisory: ADVISORY, results: getGenericMessage(result.shortages) };
  }
}

module.exports = { getRecommendations };