const simulationServices = require('../services/simulationServices');
const recommendationServices = require('../services/recommendationServices');

function scenarios(req, res) {
  res.status(200).json({
    success: true,
    data: { scenarios: simulationServices.listScenarios() },
    message: 'Scenarios loaded'
  });
}

async function run(req, res, next) {
  try {
    const result = await simulationServices.runSimulation(req.auth.userId, req.body?.scenario);
    res.status(201).json({ success: true, data: result, message: 'Simulation complete' });
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const results = await simulationServices.listResults(req.auth.userId);
    res.status(200).json({ success: true, data: { results }, message: 'Simulation history loaded' });
  } catch (error) {
    next(error);
  }
}

async function getOne(req, res, next) {
  try {
    const result = await simulationServices.getResult(req.auth.userId, req.params.id);
    res.status(200).json({ success: true, data: result, message: 'Simulation result loaded' });
  } catch (error) {
    next(error);
  }
}

async function recommendations(req, res, next) {
  try {
    const data = await recommendationServices.getRecommendations(req.auth.userId, req.params.id);
    const message = data.source === 'fallback'
      ? 'Recommendations are unavailable right now, so general advice is shown'
      : 'Recommendations loaded';
    res.status(200).json({ success: true, data, message });
  } catch (error) {
    next(error);
  }
}

module.exports = { getOne, list, recommendations, run, scenarios };