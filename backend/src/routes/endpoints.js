const express = require('express');
const { Types } = require('mongoose');
const Endpoint = require('../models/Endpoint');
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
