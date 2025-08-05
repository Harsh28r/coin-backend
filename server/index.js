import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';
import xml2js from 'xml2js';
import crypto from 'crypto';
import postRoutes from './routers/postRoute.js';

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://coin-q86peu5id-harsh28rs-projects.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
}));
app.options('*', cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// MongoDB connection with Mongoose
const connectionString = process.env.MONGODB_URI || 'mongodb+srv://harshgupta0028:M028663@cluster0.fucrcoy.mongodb.net/coins?retryWrites=true&w=majority&appName=Cluster0';
if (!connectionString) {
  throw new Error('MongoDB connection string is not defined in .env file.');
}

async function connectToDatabase() {
  try {
    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 30000, // 30s timeout
      socketTimeoutMS: 60000, // 60s socket timeout
    });
    console.log('Connected to MongoDB Atlas');
    return mongoose.connection.db;
  } catch (error) {
    console.error('MongoDB connection error:', error.message, error.stack);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Proxy endpoint for CoinCap API
app.get('/proxy-coincap', async (req, res) => {
  try {
    const response = await axios.get('https://api.coincap.io/v2/assets/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error in /proxy-coincap:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to fetch CoinCap data',
      error: error.message,
    });
  }
});

// Mount posts routes
app.use('/posts', postRoutes);

// News API endpoint
app.get('/all-news', async (req, res) => {
  try {
    const apiUrl = 'https://newsdata.io/api/1/news?apikey=pub_59933f2b9e474711aac0b2ef00ea887d4ff09&q=crypto%20market&category=business,technology';
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
    const newsData = response.data.results;
    console.log(`Fetched ${newsData.length} news items`);

    const db = await connectToDatabase();
    const collection = db.collection('coinscap');
    const result = await collection.insertMany(newsData, { ordered: false });
    console.log(`Inserted ${result.insertedCount} documents into coinscap`);

    res.status(200).json({
      success: true,
      message: `${result.insertedCount} documents were inserted`,
      data: newsData,
    });
  } catch (error) {
    console.error('Error in /all-news:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching or inserting data',
      error: error.message,
    });
  }
});

// RSS feed endpoint
app.get('/fetch-rss', async (req, res) => {
  const rssUrl = req.query.url || 'https://cointelegraph.com/rss';
  const collectionName = req.query.collection || 'rssfeeds';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    const response = await axios.get(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    const feed = response.data;
    if (feed.status !== 'ok') {
      console.error('RSS2JSON error:', feed.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch RSS feed via proxy', error: feed.message });
    }

    if (!feed.items || feed.items.length === 0) {
      console.error('No items found in RSS feed:', rssUrl);
      return res.status(200).json({ success: true, message: 'No items in RSS feed', data: [], totalItems: 0 });
    }

    const items = feed.items.map((item) => ({
      article_id: generateArticleId(item.link),
      title: item.title || 'Untitled',
      link: item.link,
      keywords: item.categories || null,
      creator: item.author ? [item.author] : ['Unknown'],
      video_url: null,
      description: item.description ? stripHtmlTags(item.description) : 'No description available',
      content: item.content ? stripHtmlTags(item.content) : null,
      pubDate: formatDate(item.pubDate) || new Date().toISOString(),
      pubDateTZ: 'UTC',
      image_url: item.thumbnail || 'https://placehold.co/300x200?text=News',
      source_id: generateSourceId(rssUrl),
      source_priority: Math.floor(Math.random() * 1000000) + 1000,
      source_name: feed.feed.title || 'CoinTelegraph',
      source_url: feed.feed.link || rssUrl,
      source_icon: null,
      language: 'english',
      country: ['global'],
      category: ['cryptocurrency'],
      ai_tag: ['crypto news'],
      ai_region: null,
      ai_org: null,
    }));

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = items.slice(startIndex, endIndex);

    const db = await connectToDatabase();
    const collection = db.collection(collectionName);

    const existingLinks = new Set(
      (await collection.find({ link: { $in: items.map(item => item.link) } }).project({ link: 1 }).toArray()).map(item => item.link)
    );
    const newItems = paginatedItems.filter(item => !existingLinks.has(item.link));

    if (newItems.length > 0) {
      const result = await collection.insertMany(newItems, { ordered: false });
      console.log(`Inserted ${result.insertedCount} new articles into ${collectionName}`);
    }

    res.status(200).json({
      success: true,
      message: `Fetched and processed RSS feed items from ${rssUrl}`,
      data: paginatedItems,
      totalItems: items.length,
      currentPage: page,
      totalPages: Math.ceil(items.length / limit),
    });
  } catch (error) {
    console.error('Error in /fetch-rss:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RSS feed',
      error: error.message,
    });
  }
});

// Another RSS feed endpoint
app.get('/fetch-another-rss', async (req, res) => {
  const rssUrl = 'https://www.newsbtc.com/feed/';
  const collectionName = 'rssfeeds1';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;

  try {
    const response = await axios.get(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      timeout: 10000,
    });
    const parser = new xml2js.Parser();
    parser.parseString(response.data, async (err, result) => {
      if (err) {
        console.error('XML parsing error:', err);
        return res.status(500).json({ success: false, message: 'Failed to parse XML', error: err.message });
      }

      if (!result.rss || !result.rss.channel || !result.rss.channel[0].item) {
        console.error('No items found in RSS feed:', rssUrl);
        return res.status(200).json({ success: true, message: 'No items in RSS feed', data: [], totalItems: 0 });
      }

      const items = result.rss.channel[0].item.map((item) => ({
        article_id: generateArticleId(item.link[0]),
        title: item.title[0] || 'Untitled',
        link: item.link[0],
        keywords: null,
        creator: item['dc:creator'] ? [item['dc:creator'][0] || 'Unknown'] : ['Unknown'],
        video_url: null,
        description: item.description ? stripHtmlTags(item.description[0]) : 'No description available',
        content: item['content:encoded'] ? stripHtmlTags(item['content:encoded'][0]) : null,
        pubDate: formatDate(item.pubDate[0]) || new Date().toISOString(),
        pubDateTZ: 'UTC',
        image_url: extractImageUrl(item) || 'https://placehold.co/300x200?text=News',
        source_id: generateSourceId(rssUrl),
        source_priority: Math.floor(Math.random() * 1000000) + 1000,
        source_name: result.rss.channel[0].title[0],
        source_url: result.rss.channel[0].link[0],
        source_icon: null,
        language: 'english',
        country: ['global'],
        category: ['cryptocurrency'],
        ai_tag: ['crypto news'],
        ai_region: null,
        ai_org: null,
      }));

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = items.slice(startIndex, endIndex);

      const db = await connectToDatabase();
      const collection = db.collection(collectionName);

      const existingLinks = new Set(
        (await collection.find({ link: { $in: items.map(item => item.link) } }).project({ link: 1 }).toArray()).map(item => item.link)
      );
      const newItems = paginatedItems.filter(item => !existingLinks.has(item.link));

      if (newItems.length > 0) {
        const result = await collection.insertMany(newItems, { ordered: false });
        console.log(`Inserted ${result.insertedCount} new articles into ${collectionName}`);
      }

      res.status(200).json({
        success: true,
        message: `Fetched and processed RSS feed items from ${rssUrl}`,
        data: paginatedItems,
        totalItems: items.length,
        currentPage: page,
        totalPages: Math.ceil(items.length / limit),
      });
    });
  } catch (error) {
    console.error('Error in /fetch-another-rss:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RSS feed',
      error: error.message,
    });
  }
});

// Trending news endpoint
app.get('/trending-news', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const coinscapCollection = db.collection('coinscap');
    const rssfeedsCollection = db.collection('rssfeeds');
    const rssfeeds1Collection = db.collection('rssfeeds1');

    const coinscapItems = await coinscapCollection.find({}).sort({ pubDate: -1 }).limit(5).toArray();
    const rssItems = await rssfeedsCollection.find({}).sort({ pubDate: -1 }).limit(5).toArray();
    const rssItems1 = await rssfeeds1Collection.find({}).sort({ pubDate: -1 }).limit(5).toArray();

    const trendingItems = [...coinscapItems, ...rssItems, ...rssItems1]
      .map(item => ({
        title: item.title || 'Untitled',
        description: item.description || item.content || 'No description available',
        creator: [item.author || (item.creator && item.creator[0]) || 'Unknown'],
        pubDate: item.pubDate || new Date().toISOString(),
        image_url: item.image_url || item.image || 'https://placehold.co/300x200?text=News',
      }))
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, 5);

    console.log(`Fetched ${trendingItems.length} trending news items`);

    res.status(200).json({
      success: true,
      message: 'Fetched trending news items',
      data: trendingItems,
    });
  } catch (error) {
    console.error('Error in /trending-news:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching trending news',
      error: error.message,
    });
  }
});

// Blogs endpoint
app.get('/blogs', (req, res) => {
  const blogs = [
    {
      title: 'Comprehensive Guide To Crafting A Metaverse Avatar',
      description: 'In the fascinating realm of the metaverse, crafting a digital avatar is key to translating your virtual identity...',
      author: 'Contributor Author',
      date: 'April 16, 2024',
      image: 'https://placehold.co/300x200?text=Metaverse',
    },
  ];
  res.status(200).json({ success: true, data: blogs });
});

// Check oplog
app.get('/check-oplog', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const stats = await db.collection('oplog.rs').stats();
    res.status(200).json({ success: true, oplogSize: stats.size / (1024 * 1024) + ' MB' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear old RSS data
app.get('/clear-old-rss', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const collections = ['rssfeeds', 'rssfeeds1'];
    for (const coll of collections) {
      const result = await db.collection(coll).deleteMany({
        pubDate: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      });
      console.log(`Deleted ${result.deletedCount} old items from ${coll}`);
    }
    res.status(200).json({ success: true, message: 'Cleared old RSS data' });
  } catch (error) {
    console.error('Error clearing old data:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Backup RSS data
app.get('/backup-rss', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const collections = ['rssfeeds', 'rssfeeds1'];
    const backup = {};
    for (const coll of collections) {
      backup[coll] = await db.collection(coll).find({}).toArray();
    }
    res.status(200).json({ success: true, data: backup });
  } catch (error) {
    console.error('Backup error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk RSS fetch endpoint
app.post('/', async (req, res) => {
  const { urls } = req.body;
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'Invalid input. Please provide an array of URLs.' });
  }
  try {
    const jsonData = await fetchRssToJson(urls);
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return res.status(400).json({ error: 'No valid data to insert.' });
    }
    const db = await connectToDatabase();
    const collection = db.collection('rssfeeds');
    const result = await collection.insertMany(jsonData, { ordered: false });
    res.json({ success: true, insertedCount: result.insertedCount, data: jsonData });
  } catch (error) {
    console.error('Error saving RSS data to MongoDB:', error.message);
    res.status(500).json({ error: 'An error occurred while processing the feeds.', details: error.message });
  }
});

// Helper functions
async function fetchRssToJson(urls) {
  const jsonResults = [];
  const rssFeedUrl = 'https://thedefiant.io/feed/';
  urls.push(rssFeedUrl);
  const db = await connectToDatabase();
  const collection = db.collection('rssfeeds');
  for (const url of urls) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
        timeout: 10000,
      });
      const xml = response.data;
      const result = await xml2js.parseStringPromise(xml);
      jsonResults.push(result);
      await collection.insertOne(result);
      console.log(`1 document was inserted for URL: ${url}`);
    } catch (error) {
      console.error(`Error fetching or parsing ${url}:`, error.message);
    }
  }
  return jsonResults;
}

function generateArticleId(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

function formatDate(dateStr) {
  return new Date(dateStr).toISOString().replace('T', ' ').slice(0, 19);
}

function extractImageUrl(item) {
  if (item['media:content']) {
    return item['media:content'][0].$.url;
  }
  if (item.enclosure) {
    return item.enclosure[0].$.url;
  }
  if (item['content:encoded']) {
    const content = item['content:encoded'][0];
    const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) {
      return imgMatch[1];
    }
  }
  return null;
}

function generateSourceId(url) {
  try {
    const domain = new URL(url).hostname
      .replace('www.', '')
      .replace('.com', '')
      .replace('.org', '')
      .replace(/\./g, '_');
    return domain.toLowerCase();
  } catch {
    return 'unknown_source';
  }
}

function stripHtmlTags(html) {
  if (!html) return null;
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  try {
    await connectToDatabase();
    console.log(`Server is running on http://localhost:${PORT}`);
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
});