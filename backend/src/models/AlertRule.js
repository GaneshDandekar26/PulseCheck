const { Schema, model, Types } = require('mongoose');

const alertRuleSchema = new Schema(
  {
    owner: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    endpointId: {
      type: Types.ObjectId,
      ref: 'Endpoint',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['latency', 'downtime'],
    },
    thresholdMs: {
      type: Number,
      required: true,
      min: 1,
    },
    notifyEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    cooldownMinutes: {
      type: Number,
      required: true,
      min: 1,
      default: 30,
    },
    lastAlertSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

alertRuleSchema.index({ endpointId: 1, type: 1 });

module.exports = model('AlertRule', alertRuleSchema);
