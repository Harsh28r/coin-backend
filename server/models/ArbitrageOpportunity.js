import mongoose from 'mongoose';

const arbitrageOpportunitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Can be null for global opportunities
      index: true,
    },
    symbol: {
      type: String,
      required: true,
      // e.g., "BTC/USDT", "ETH/USDT"
    },
    buyExchange: {
      type: String,
      required: true,
      lowercase: true,
    },
    buyPrice: {
      type: Number,
      required: true,
    },
    sellExchange: {
      type: String,
      required: true,
      lowercase: true,
    },
    sellPrice: {
      type: Number,
      required: true,
    },
    profitPercent: {
      type: Number,
      required: true,
    },
    profitAmount: {
      type: Number,
      required: true,
      // Estimated profit in USD
    },
    tradingFees: {
      buyFee: {
        type: Number,
        default: 0.1, // 0.1% fee
      },
      sellFee: {
        type: Number,
        default: 0.1,
      },
    },
    netProfitPercent: {
      type: Number,
      required: true,
      // Profit after fees
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'executed', 'failed'],
      default: 'active',
    },
    volume24h: {
      type: Number,
      default: null,
      // 24h volume for the pair
    },
    liquidity: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    expiresAt: {
      type: Date,
      default: function () {
        // Opportunities expire after 2 minutes
        return new Date(Date.now() + 2 * 60 * 1000);
      },
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding active opportunities
arbitrageOpportunitySchema.index({ status: 1, expiresAt: 1 });
arbitrageOpportunitySchema.index({ userId: 1, status: 1 });
arbitrageOpportunitySchema.index({ createdAt: -1 });

// Auto-expire opportunities after 2 minutes
arbitrageOpportunitySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to check if opportunity is still valid
arbitrageOpportunitySchema.methods.isValid = function () {
  return this.status === 'active' && this.expiresAt > new Date();
};

// Method to calculate potential profit for a given amount
arbitrageOpportunitySchema.methods.calculateProfit = function (tradeAmount) {
  const buyAmount = tradeAmount - (tradeAmount * this.tradingFees.buyFee) / 100;
  const sellRevenue = buyAmount * (this.sellPrice / this.buyPrice);
  const finalAmount = sellRevenue - (sellRevenue * this.tradingFees.sellFee) / 100;
  return finalAmount - tradeAmount;
};

const ArbitrageOpportunity = mongoose.model('ArbitrageOpportunity', arbitrageOpportunitySchema);

export default ArbitrageOpportunity;
