const express = require('express');
const { Types } = require('mongoose');
const Endpoint = require('../models/Endpoint');
const PingLog = require('../models/PingLog');
const { registerOrUpdateEndpoint, unregisterEndpoint } = require('../scheduler/pingScheduler');

const router = express.Router();

const isValidUrl = (value) => {
  if (typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

const isPositiveInt = (value) => Number.isInteger(value) && value > 0;

router.get('/', async (req, res) => {
  try {
    const endpoints = await Endpoint.find({ owner: req.user.id }).sort({ createdAt: -1 });
    return res.json(endpoints);
  } catch (error) {
    console.error('[endpoints] list failed', error);
    return res.status(500).json({ message: 'Failed to fetch endpoints' });
  }
});

router.get('/:id/stats', async (req, res) => {
  const { id } = req.params;
  const { window = '1h' } = req.query;
  const windows = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  };

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid endpoint id' });
  }
  if (!windows[window]) {
    return res.status(400).json({ message: 'window must be one of 1h, 24h, or 7d' });
  }

  try {
    const endpoint = await Endpoint.findOne({ _id: id, owner: req.user.id });
    if (!endpoint) {
      return res.status(404).json({ message: 'Endpoint not found' });
    }

    const windowStart = new Date(Date.now() - windows[window]);
    const stats = await PingLog.aggregate([
      { $match: { endpointId: new Types.ObjectId(id), timestamp: { $gte: windowStart } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgLatencyMs: { $avg: '$latencyMs' },
          upCount: { $sum: { $cond: ['$isUp', 1, 0] } },
          errorCount: { $sum: { $cond: ['$isUp', 0, 1] } },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          avgLatencyMs: { $ifNull: ['$avgLatencyMs', 0] },
          uptimePct: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$upCount', '$total'] }, 100] },
              0,
            ],
          },
          errorRate: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$errorCount', '$total'] }, 100] },
              0,
            ],
          },
        },
      },
    ]);

    const result = stats[0] || { total: 0, avgLatencyMs: 0, uptimePct: 0, errorRate: 0 };
    return res.json({ window, ...result });
  } catch (error) {
    console.error('[endpoints] stats failed', error);
    return res.status(500).json({ message: 'Failed to compute stats' });
  }
});

router.get('/:id/logs', async (req, res) => {
  const { id } = req.params;
  const limit = Number(req.query.limit) || 50;
  const page = Number(req.query.page) || 1;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid endpoint id' });
  }
  if (!Number.isInteger(limit) || limit <= 0 || limit > 200) {
    return res.status(400).json({ message: 'limit must be an integer between 1 and 200' });
  }
  if (!Number.isInteger(page) || page <= 0) {
    return res.status(400).json({ message: 'page must be a positive integer' });
  }

  try {
    const endpoint = await Endpoint.findOne({ _id: id, owner: req.user.id });
    if (!endpoint) {
      return res.status(404).json({ message: 'Endpoint not found' });
    }

    const [logs, total] = await Promise.all([
      PingLog.find({ endpointId: id })
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PingLog.countDocuments({ endpointId: id }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    return res.json({ page, limit, total, totalPages, results: logs });
  } catch (error) {
    console.error('[endpoints] logs failed', error);
    return res.status(500).json({ message: 'Failed to fetch logs' });
  }
});

router.post('/', async (req, res) => {
  const { name, url, method = 'GET', intervalMinutes, thresholdMs, isActive = true } = req.body || {};

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: 'Name is required' });
  }
  if (!isValidUrl(url)) {
    return res.status(400).json({ message: 'Invalid URL' });
  }
  const normalizedMethod = String(method).toUpperCase();
  if (!Endpoint.schema.path('method').enumValues.includes(normalizedMethod)) {
    return res.status(400).json({ message: 'Invalid HTTP method' });
  }
  if (!isPositiveInt(Number(intervalMinutes))) {
    return res.status(400).json({ message: 'intervalMinutes must be a positive integer' });
  }
  if (!isPositiveInt(Number(thresholdMs))) {
    return res.status(400).json({ message: 'thresholdMs must be a positive integer' });
  }

  try {
    const created = await Endpoint.create({
      owner: req.user.id,
      name: name.trim(),
      url: url.trim(),
      method: normalizedMethod,
      intervalMinutes: Number(intervalMinutes),
      thresholdMs: Number(thresholdMs),
      isActive: Boolean(isActive),
    });
    registerOrUpdateEndpoint(created);
    return res.status(201).json(created);
  } catch (error) {
    console.error('[endpoints] create failed', error);
    return res.status(500).json({ message: 'Failed to create endpoint' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid endpoint id' });
  }

  const updates = {};
  const { name, url, method, intervalMinutes, thresholdMs, isActive } = req.body || {};

  if (name !== undefined) {
    if (!name || typeof name !== 'string') return res.status(400).json({ message: 'Name is required' });
    updates.name = name.trim();
  }
  if (url !== undefined) {
    if (!isValidUrl(url)) return res.status(400).json({ message: 'Invalid URL' });
    updates.url = url.trim();
  }
  if (method !== undefined) {
    const normalizedMethod = String(method).toUpperCase();
    if (!Endpoint.schema.path('method').enumValues.includes(normalizedMethod)) {
      return res.status(400).json({ message: 'Invalid HTTP method' });
    }
    updates.method = normalizedMethod;
  }
  if (intervalMinutes !== undefined) {
    if (!isPositiveInt(Number(intervalMinutes))) {
      return res.status(400).json({ message: 'intervalMinutes must be a positive integer' });
    }
    updates.intervalMinutes = Number(intervalMinutes);
  }
  if (thresholdMs !== undefined) {
    if (!isPositiveInt(Number(thresholdMs))) {
      return res.status(400).json({ message: 'thresholdMs must be a positive integer' });
    }
    updates.thresholdMs = Number(thresholdMs);
  }
  if (isActive !== undefined) {
    updates.isActive = Boolean(isActive);
  }

  try {
    const existing = await Endpoint.findOne({ _id: id, owner: req.user.id });
    if (!existing) {
      return res.status(404).json({ message: 'Endpoint not found' });
    }

    Object.assign(existing, updates);
    await existing.save();
    registerOrUpdateEndpoint(existing);
    return res.json(existing);
  } catch (error) {
    console.error('[endpoints] update failed', error);
    return res.status(500).json({ message: 'Failed to update endpoint' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid endpoint id' });
  }

  try {
    const deleted = await Endpoint.findOneAndDelete({ _id: id, owner: req.user.id });
    if (!deleted) {
      return res.status(404).json({ message: 'Endpoint not found' });
    }
    unregisterEndpoint(id);
    return res.status(204).send();
  } catch (error) {
    console.error('[endpoints] delete failed', error);
    return res.status(500).json({ message: 'Failed to delete endpoint' });
  }
});

module.exports = router;
