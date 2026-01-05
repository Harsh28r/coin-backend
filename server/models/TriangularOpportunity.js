import mongoose from 'mongoose';

const triangularOpportunitySchema = new mongoose.Schema(
  {
    exchange: {
      type: String,
      required: true,
      enum: ['binance', 'kraken', 'coinbase'],
    },
    baseCurrency: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
      // Example: "BTC → ETH → USDT → BTC"
    },
    pairs: {
      type: [String],
      required: true,
      // Example: ["BTCETH", "ETHUSDT", "USDTBTC"]
    },
    step1: {
      pair: String,
      price: Number,
      direction: String, // 'forward' or 'reverse'
    },
    step2: {
      pair: String,
      price: Number,
      direction: String,
    },
    step3: {
      pair: String,
      price: Number,
      direction: String,
    },
    startAmount: {
      type: Number,
      required: true,
      default: 1,
    },
    endAmount: {
      type: Number,
      required: true,
    },
    profitPercent: {
      type: Number,
      required: true,
    },
    netProfitPercent: {
      type: Number,
      required: true,
    },
    profitAmount: {
      type: Number,
      required: true,
    },
    tradingFees: {
      step1Fee: { type: Number, default: 0.1 },
      step2Fee: { type: Number, default: 0.1 },
      step3Fee: { type: Number, default: 0.1 },
      totalFee: { type: Number, default: 0.3 },
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'executed'],
      default: 'active',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
triangularOpportunitySchema.index({ exchange: 1, status: 1, createdAt: -1 });
triangularOpportunitySchema.index({ netProfitPercent: -1 });
triangularOpportunitySchema.index({ expiresAt: 1 });

// Prevent duplicate opportunities
triangularOpportunitySchema.index(
  {
    exchange: 1,
    path: 1,
    createdAt: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
    },
  }
);

const TriangularOpportunity = mongoose.model('TriangularOpportunity', triangularOpportunitySchema);

export default TriangularOpportunity;
