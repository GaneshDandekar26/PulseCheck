const cron = require('node-cron');
const axios = require('axios');
const Endpoint = require('../models/Endpoint');
const PingLog = require('../models/PingLog');
const { checkAlerts } = require('../alerts/alertService');

const jobs = new Map();

const cronExprFromMinutes = (minutes) => {
  const m = Math.max(1, minutes);
  if (m < 60) return `*/${m} * * * *`;
  const hours = Math.floor(m / 60);
  return `0 */${hours} * * *`;
};

const recordPing = async ({ endpoint, statusCode, latencyMs, isUp, errorMessage }) => {
  try {
    const log = await PingLog.create({
      endpointId: endpoint._id,
      statusCode,
      latencyMs,
      isUp,
      errorMessage: errorMessage || null,
      timestamp: new Date(),
    });
    await checkAlerts(log);
  } catch (error) {
    console.error('[scheduler] Failed to record ping', error);
  }
};

const runPing = async (endpoint) => {
  const start = Date.now();
  try {
    const response = await axios.request({
      url: endpoint.url,
      method: endpoint.method,
      timeout: endpoint.thresholdMs * 2,
      validateStatus: () => true,
    });
    const latencyMs = Date.now() - start;
    const isUp = response.status < 500;
    await recordPing({ endpoint, statusCode: response.status, latencyMs, isUp });
  } catch (error) {
    const latencyMs = Date.now() - start;
    const statusCode = error.response?.status;
    await recordPing({
      endpoint,
      statusCode,
      latencyMs,
      isUp: false,
      errorMessage: error.message,
    });
  }
};

const scheduleEndpoint = (endpoint) => {
  const id = endpoint._id.toString();
  if (jobs.has(id)) {
    jobs.get(id).stop();
    jobs.delete(id);
  }

  if (!endpoint.isActive) {
    return;
  }

  const expression = cronExprFromMinutes(endpoint.intervalMinutes);
  const job = cron.schedule(expression, () => runPing(endpoint), {
    timezone: 'UTC',
  });
  jobs.set(id, job);
};

const removeEndpointJob = (endpointId) => {
  const id = endpointId.toString();
  const job = jobs.get(id);
  if (job) {
    job.stop();
    jobs.delete(id);
  }
};

const registerOrUpdateEndpoint = (endpoint) => {
  scheduleEndpoint(endpoint);
};

const unregisterEndpoint = (endpointId) => {
  removeEndpointJob(endpointId);
};

const loadAllActive = async () => {
  const activeEndpoints = await Endpoint.find({ isActive: true });
  activeEndpoints.forEach(scheduleEndpoint);
};

const initScheduler = async () => {
  try {
    await loadAllActive();
    console.log(`[scheduler] Registered ${jobs.size} endpoint jobs`);
  } catch (error) {
    console.error('[scheduler] Failed to initialize jobs', error);
  }
};

module.exports = {
  initScheduler,
  registerOrUpdateEndpoint,
  unregisterEndpoint,
};
