const simulationServices = require('../services/simulationServices');

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

module.exports = { getOne, list, run, scenarios };
