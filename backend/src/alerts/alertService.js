const nodemailer = require('nodemailer');
const AlertRule = require('../models/AlertRule');
const AlertEvent = require('../models/AlertEvent');
const Endpoint = require('../models/Endpoint');

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) {
    console.warn('[alerts] SMTP_HOST not configured; alert emails will not be sent');
    return null;
  }

  const port = Number(SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  return transporter;
};

const sendAlertEmail = async ({ rule, endpoint, pingLog, reason }) => {
  const tx = getTransporter();
  if (!tx) return;

  const from = process.env.SMTP_FROM || 'alerts@pulsecheck.local';
  const subject = `[PulseCheck] ${endpoint.name} alert (${rule.type})`;
  const lines = [
    `Endpoint: ${endpoint.name} (${endpoint.url})`,
    `Type: ${rule.type}`,
    `Reason: ${reason}`,
    `Latency: ${pingLog.latencyMs}ms`,
    `Status: ${pingLog.statusCode ?? 'n/a'}`,
    `Time: ${new Date(pingLog.timestamp).toISOString()}`,
  ];

  await tx.sendMail({
    from,
    to: rule.notifyEmail,
    subject,
    text: lines.join('\n'),
  });
};

const checkAlerts = async (pingLog) => {
  const endpoint = await Endpoint.findById(pingLog.endpointId).lean();
  if (!endpoint) return;

  const now = new Date();
  const rules = await AlertRule.find({ endpointId: endpoint._id });

  for (const rule of rules) {
    const cooldownMs = (rule.cooldownMinutes || 0) * 60 * 1000;
    const inCooldown = rule.lastAlertSentAt && now - rule.lastAlertSentAt < cooldownMs;

    let shouldTrigger = false;
    let reason = '';

    if (rule.type === 'latency' && pingLog.isUp && pingLog.latencyMs > rule.thresholdMs) {
      shouldTrigger = true;
      reason = `latency ${pingLog.latencyMs}ms exceeded threshold ${rule.thresholdMs}ms`;
    }

    if (rule.type === 'downtime' && !pingLog.isUp) {
      shouldTrigger = true;
      reason = `endpoint down (status ${pingLog.statusCode ?? 'n/a'})`;
    }

    if (shouldTrigger) {
      if (inCooldown) {
        continue;
      }

      await AlertEvent.create({
        alertRuleId: rule._id,
        endpointId: endpoint._id,
        triggeredAt: now,
        resolvedAt: null,
      });

      await AlertRule.updateOne({ _id: rule._id }, { lastAlertSentAt: now });
      await sendAlertEmail({ rule, endpoint, pingLog, reason });
      continue;
    }

    if (rule.type === 'downtime' && pingLog.isUp) {
      await AlertEvent.findOneAndUpdate(
        { alertRuleId: rule._id, endpointId: endpoint._id, resolvedAt: null },
        { resolvedAt: now }
      );
    }
  }
};

module.exports = {
  checkAlerts,
};
