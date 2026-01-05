# 🚀 Crypto Arbitrage Scanner Platform

A FREE cryptocurrency arbitrage opportunity scanner that shows price differences across multiple exchanges. Users can see profitable trading opportunities and execute trades manually on exchanges.

## ✨ Features

- ✅ **Real-time Arbitrage Scanner** - Scans 15+ coin pairs across Binance, Kraken, Coinbase
- ✅ **FREE Public APIs** - No API keys required!
- ✅ **User Authentication** - Register, login, JWT-based auth
- ✅ **Live Opportunities** - Shows buy/sell prices, profit %, exchanges
- ✅ **Automatic Scanning** - Runs every 30 seconds via cron job
- ✅ **Historical Data** - View past opportunities and statistics
- ✅ **REST API** - Well-documented endpoints for frontend integration

## 🏗️ Architecture

### Backend Stack
- **Node.js + Express** - REST API server
- **MongoDB** - Database for opportunities, users
- **CCXT** - (Optional) Can be removed if not using authenticated APIs
- **Axios** - HTTP client for fetching prices
- **node-cron** - Automated scanning every 30 seconds
- **bcrypt + JWT** - User authentication & security

### Data Sources (100% FREE!)
1. **Binance Public API** - `https://api.binance.com/api/v3/ticker/24hr`
2. **Kraken Public API** - `https://api.kraken.com/0/public/Ticker`
3. **Coinbase Public API** - `https://api.coinbase.com/v2/prices/{pair}/spot`
4. **CoinGecko** - (Optional) Free tier available
5. **CoinCap** - (Optional) Already in your codebase

## 📦 Installation

### 1. Install Dependencies
```bash
cd D:\C\Desktop\coins\back\coin-backend\server
npm install
```

### 2. Create Admin User
```bash
node seed.js
```
This creates an admin account:
- **Email**: admin@arbitrage.com
- **Password**: admin123456

### 3. Start Server
```bash
npm start
```

Server runs on: `http://localhost:5000`

## 🔌 API Endpoints

### Authentication
```
POST /auth/register        - Register new user
POST /auth/login           - Login user
GET  /auth/me              - Get current user (requires auth)
PUT  /auth/profile         - Update profile (requires auth)
PUT  /auth/change-password - Change password (requires auth)
```

### Arbitrage Opportunities
```
GET  /arbitrage/opportunities  - Get active opportunities
GET  /arbitrage/history        - Get opportunity history
GET  /arbitrage/stats          - Get statistics
GET  /arbitrage/opportunity/:id - Get single opportunity
GET  /arbitrage/scan           - Trigger manual scan (admin only)
DELETE /arbitrage/cleanup      - Delete old opportunities (admin only)
```

### Example Response: Get Opportunities
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "...",
      "symbol": "BTC/USDT",
      "buyExchange": "binance",
      "buyPrice": 43250.50,
      "sellExchange": "kraken",
      "sellPrice": 43520.75,
      "profitPercent": 0.62,
      "netProfitPercent": 0.42,
      "profitAmount": 4.20,
      "liquidity": "high",
      "volume24h": 1250000,
      "status": "active",
      "createdAt": "2026-01-05T10:30:00.000Z",
      "expiresAt": "2026-01-05T10:32:00.000Z"
    }
  ]
}
```

## 🔄 How the Scanner Works

1. **Cron Job** - Runs every 30 seconds automatically
2. **Fetch Prices** - Queries Binance, Kraken, Coinbase public APIs
3. **Compare** - Finds lowest buy price and highest sell price
4. **Calculate Profit** - Accounts for 0.2% trading fees
5. **Filter** - Only shows opportunities with >0.5% profit
6. **Save to DB** - Stores in MongoDB for user viewing
7. **Auto-Expire** - Opportunities expire after 2 minutes

## 🎯 Use Cases

### For Users
1. **View Opportunities** - See profitable arbitrage chances
2. **Manual Trading** - Users trade on exchanges themselves
3. **Email Alerts** - Get notified when big opportunities appear
4. **Track History** - Analyze past opportunities

### For Platform Owner (You)
1. **Affiliate Links** - Add referral links to exchanges, earn commissions
2. **Premium Features** - Charge for faster scans, more pairs, alerts
3. **Ad Revenue** - Monetize via ads on dashboard
4. **Data Insights** - Sell aggregated market data

## 📊 Database Models

### User
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  role: 'user' | 'admin',
  isActive: Boolean,
  emailNotifications: Boolean,
  riskSettings: {
    maxTradeAmount: Number,
    minProfitPercent: Number,
    dailyLossLimit: Number
  }
}
```

### ArbitrageOpportunity
```javascript
{
  symbol: String,              // "BTC/USDT"
  buyExchange: String,         // "binance"
  buyPrice: Number,
  sellExchange: String,        // "kraken"
  sellPrice: Number,
  profitPercent: Number,
  netProfitPercent: Number,    // After fees
  profitAmount: Number,        // For $1000 trade
  volume24h: Number,
  liquidity: 'low'|'medium'|'high',
  status: 'active'|'expired',
  expiresAt: Date
}
```

## 🔐 Security Features

- ✅ Password hashing with bcrypt (10 salt rounds)
- ✅ JWT tokens for authentication (7-day expiry)
- ✅ AES-256 encryption for sensitive data
- ✅ CORS configured for frontend
- ✅ Rate limiting ready (can add express-rate-limit)
- ✅ Input validation with express-validator

## 🚀 Next Steps / Enhancements

### Phase 1 (Current)
- [x] User authentication
- [x] Arbitrage scanner (FREE APIs)
- [x] Real-time opportunity detection
- [x] REST API endpoints

### Phase 2 (Future)
- [ ] WebSocket for real-time notifications
- [ ] Email alerts (Nodemailer + SendGrid)
- [ ] Referral link tracking
- [ ] Premium subscription tiers
- [ ] More exchanges (Bybit, OKX, etc.)
- [ ] Mobile responsive dashboard
- [ ] Trading history (user clicks on opportunity)
- [ ] Profit calculator tool

### Phase 3 (Advanced)
- [ ] Machine learning for profit prediction
- [ ] Telegram bot for alerts
- [ ] API rate limiting & throttling
- [ ] Analytics dashboard for admins
- [ ] Multi-language support

## 📝 Environment Variables

```env
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-encryption-key
PORT=5000
```

## 🐛 Troubleshooting

### Scanner not finding opportunities?
- Check if exchange APIs are accessible
- Try lowering profit threshold in scanner (line 263)
- Add more exchanges (CoinGecko, CoinCap)

### Opportunities expiring too fast?
- Increase expiration time in ArbitrageOpportunity model (line 81)

### Too many API rate limit errors?
- Increase scan interval in scannerJob.js (from 30s to 60s)

## 📞 Support & Contact

For questions or issues, contact: your-email@example.com

---

**Made with ❤️ by Your Name | 2026**
