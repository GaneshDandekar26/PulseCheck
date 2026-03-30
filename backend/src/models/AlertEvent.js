const { Schema, model, Types } = require('mongoose');

const alertEventSchema = new Schema(
  {
    alertRuleId: {
      type: Types.ObjectId,
      ref: 'AlertRule',
      required: true,
      index: true,
    },
    endpointId: {
      type: Types.ObjectId,
      ref: 'Endpoint',
      required: true,
      index: true,
    },
    triggeredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    versionKey: false,
  }
);

alertEventSchema.index({ endpointId: 1, triggeredAt: -1 });

module.exports = model('AlertEvent', alertEventSchema);
