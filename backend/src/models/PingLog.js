const { Schema, model, Types } = require('mongoose');

const pingLogSchema = new Schema(
  {
    endpointId: {
      type: Types.ObjectId,
      ref: 'Endpoint',
      required: true,
      index: true,
    },
    statusCode: {
      type: Number,
    },
    latencyMs: {
      type: Number,
      required: true,
    },
    isUp: {
      type: Boolean,
      required: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = model('PingLog', pingLogSchema);
