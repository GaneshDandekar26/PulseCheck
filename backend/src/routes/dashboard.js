const express = require('express');
const { Types } = require('mongoose');
const Endpoint = require('../models/Endpoint');

const router = express.Router();

router.get('/summary', async (req, res) => {
  const ownerId = new Types.ObjectId(req.user.id);

  try {
    const [summary] = await Endpoint.aggregate([
      { $match: { owner: ownerId } },
      {
        $facet: {
          endpointMeta: [
            {
              $group: {
                _id: null,
                totalEndpoints: { $sum: 1 },
                activeEndpoints: { $sum: { $cond: ['$isActive', 1, 0] } },
              },
            },
          ],
          logStats: [
            {
              $lookup: {
                from: 'pinglogs',
                localField: '_id',
                foreignField: 'endpointId',
                as: 'logs',
              },
            },
            { $unwind: '$logs' },
            {
              $group: {
                _id: null,
                totalLogs: { $sum: 1 },
                avgLatencyMs: { $avg: '$logs.latencyMs' },
                upCount: { $sum: { $cond: ['$logs.isUp', 1, 0] } },
                errorCount: { $sum: { $cond: ['$logs.isUp', 0, 1] } },
                lastPingAt: { $max: '$logs.timestamp' },
              },
            },
          ],
        },
      },
      {
        $project: {
          endpointMeta: { $arrayElemAt: ['$endpointMeta', 0] },
          logStats: { $arrayElemAt: ['$logStats', 0] },
        },
      },
    ]);

    const meta = summary?.endpointMeta || { totalEndpoints: 0, activeEndpoints: 0 };
    const logs =
      summary?.logStats || { totalLogs: 0, avgLatencyMs: 0, upCount: 0, errorCount: 0, lastPingAt: null };

    const uptimePct = logs.totalLogs > 0 ? (logs.upCount / logs.totalLogs) * 100 : 0;
    const errorRate = logs.totalLogs > 0 ? (logs.errorCount / logs.totalLogs) * 100 : 0;

    return res.json({
      totalEndpoints: meta.totalEndpoints || 0,
      activeEndpoints: meta.activeEndpoints || 0,
      totalLogs: logs.totalLogs || 0,
      avgLatencyMs: logs.avgLatencyMs || 0,
      uptimePct,
      errorRate,
      lastPingAt: logs.lastPingAt || null,
    });
  } catch (error) {
    console.error('[dashboard] summary failed', error);
    return res.status(500).json({ message: 'Failed to fetch dashboard summary' });
  }
});

module.exports = router;
