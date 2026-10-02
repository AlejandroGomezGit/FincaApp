const { createDemoFarm } = require('../services/demoData.service');

exports.create = async (req, res, next) => {
  try {
    const farm = await createDemoFarm(req.userId);
    res.status(201).json(farm);
  } catch (err) { next(err); }
};
