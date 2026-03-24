const { Schema, model, Types } = require('mongoose');

const endpointSchema = new Schema(
  {
    owner: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    method: {
      type: String,
      required: true,
      uppercase: true,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    },
    intervalMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    thresholdMs: {
      type: Number,
      required: true,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = model('Endpoint', endpointSchema);
