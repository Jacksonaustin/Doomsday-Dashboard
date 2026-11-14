const checklistServices = require('../services/checklistServices');

async function list(req, res, next) {
  try {
    const items = await checklistServices.listChecklist(req.auth.userId);
    res.status(200).json({ success: true, data: { items }, message: 'Checklist loaded' });
  } catch (error) {
    next(error);
  }
}

async function add(req, res, next) {
  try {
    const result = await checklistServices.addChecklistItem(req.auth.userId, req.body);
    res.status(result.created ? 201 : 200).json({
      success: true,
      data: { item: result.item },
      message: result.created ? 'Checklist item added' : 'Checklist item already exists'
    });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const item = await checklistServices.setChecklistItemCompleted(
      req.auth.userId,
      req.params.id,
      req.body?.completed
    );
    res.status(200).json({ success: true, data: { item }, message: 'Checklist item updated' });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    await checklistServices.removeChecklistItem(req.auth.userId, req.params.id);
    res.status(200).json({ success: true, data: {}, message: 'Checklist item removed' });
  } catch (error) {
    next(error);
  }
}

module.exports = { add, list, remove, update };
