const express = require('express');
const { Types } = require('mongoose');
const AlertRule = require('../models/AlertRule');
const AlertEvent = require('../models/AlertEvent');
const Endpoint = require('../models/Endpoint');

const router = express.Router();

const isPositiveInt = (value) => Number.isInteger(value) && value > 0;
const isEmailValid = (email) => typeof email === 'string' && /^\S+@\S+\.\S+$/.test(email);

router.post('/', async (req, res) => {
  const { endpointId, type, thresholdMs, notifyEmail, cooldownMinutes } = req.body || {};

  if (!Types.ObjectId.isValid(endpointId)) {
    return res.status(400).json({ message: 'Invalid endpointId' });
  }
  if (!['latency', 'downtime'].includes(type)) {
    return res.status(400).json({ message: 'type must be latency or downtime' });
  }
  if (!isPositiveInt(Number(thresholdMs))) {
    return res.status(400).json({ message: 'thresholdMs must be a positive integer' });
  }
  if (!isEmailValid(notifyEmail)) {
    return res.status(400).json({ message: 'notifyEmail is invalid' });
  }
  if (!isPositiveInt(Number(cooldownMinutes))) {
    return res.status(400).json({ message: 'cooldownMinutes must be a positive integer' });
  }

  try {
    const endpoint = await Endpoint.findOne({ _id: endpointId, owner: req.user.id });
    if (!endpoint) {
      return res.status(404).json({ message: 'Endpoint not found' });
    }

    const rule = await AlertRule.create({
      owner: req.user.id,
      endpointId,
      type,
      thresholdMs: Number(thresholdMs),
      notifyEmail: notifyEmail.trim().toLowerCase(),
      cooldownMinutes: Number(cooldownMinutes),
    });

    return res.status(201).json(rule);
  } catch (error) {
    console.error('[alerts] create failed', error);
    return res.status(500).json({ message: 'Failed to create alert rule' });
  }
});

router.get('/:endpointId/history', async (req, res) => {
  const { endpointId } = req.params;
  const limit = Number(req.query.limit) || 50;

  if (!Types.ObjectId.isValid(endpointId)) {
    return res.status(400).json({ message: 'Invalid endpointId' });
  }
  if (!isPositiveInt(limit) || limit > 200) {
    return res.status(400).json({ message: 'limit must be between 1 and 200' });
  }

  try {
    const endpoint = await Endpoint.findOne({ _id: endpointId, owner: req.user.id });
    if (!endpoint) {
      return res.status(404).json({ message: 'Endpoint not found' });
    }

    const events = await AlertEvent.find({ endpointId })
      .sort({ triggeredAt: -1 })
      .limit(limit)
      .populate({ path: 'alertRuleId', select: 'type thresholdMs notifyEmail cooldownMinutes' })
      .lean();

    return res.json({ endpointId, results: events });
  } catch (error) {
    console.error('[alerts] history failed', error);
    return res.status(500).json({ message: 'Failed to fetch alert history' });
  }
});

module.exports = router;
