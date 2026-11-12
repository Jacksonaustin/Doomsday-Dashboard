const householdServices = require('../services/householdServices');

async function getOne(req, res, next) {
  try {
    const household = await householdServices.getHousehold(req.auth.userId);
    res.status(200).json({
      success: true,
      data: { household },
      message: household ? 'Household loaded' : 'No household profile yet'
    });
  } catch (error) {
    next(error);
  }
}

async function save(req, res, next) {
  try {
    const household = await householdServices.saveHousehold(req.auth.userId, req.body);
    res.status(200).json({ success: true, data: { household }, message: 'Household saved' });
  } catch (error) {
    next(error);
  }
}

module.exports = { getOne, save };
