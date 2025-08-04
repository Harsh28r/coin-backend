import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import xml2js from "xml2js";
import { MongoClient } from "mongodb";
import crypto from "crypto";
import router from "./controllers/postController.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const connectionString = process.env.MONGODB_URI || "mongodb+srv://harshgupta0028:M028663@cluster0.fucrcoy.mongodb.net/coins?retryWrites=true&w=majority&appName=Cluster0";
if (!connectionString) {
  throw new Error("MongoDB connection string is not defined in .env file.");
}

let client;
let db;

async function connectToDatabase() {
  if (!client || !client.topology || !client.topology.isConnected()) {
    client = new MongoClient(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();
    console.log("Connected to MongoDB Atlas with user: harshgupta0028");
  }
  db = client.db("coins");
  return db;
}

process.on("SIGTERM", async () => {
  if (client) {
    await client.close();
    console.log("MongoDB connection closed");
  }
  process.exit(0);
});

app.get("/test", (req, res) => {
  res.json({ message: "API is working!" });
});

app.use("/api/posts", router);

async function makeApiRequest(url) {
  if (!url.includes("apikey") || !url.includes("q")) {
    return {
      status: 400,
      success: false,
      message: "Invalid request parameters",
      error: "API key and query parameter 'q' are required.",
    };
  }
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000
    });
    console.log("API response received");
    return {
      status: 200,
      success: true,
      message: "Successfully fetched the data",
      data: response.data.results,
    };
  } catch (error) {
    console.error("API request error:", error.message);
    console.error("Response:", error.response?.data);
    console.error("Headers:", error.response?.headers);
    return {
      status: error.response?.status || 500,
      success: false,
      message: "Failed to fetch data from the API",
      error: error.message,
      apiErrorMessage: error.response?.data?.results?.message || error.message,
    };
  }
}

app.get("/all-news", async (req, res) => {
  try {
    const apiUrl =
      "https://newsdata.io/api/1/news?apikey=pub_59933f2b9e474711aac0b2ef00ea887d4ff09&q=crypto%20market&category=business,technology";
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000
    });
    const newsData = response.data.results;
    console.log(`Fetched ${newsData.length} news items`);

    const db = await connectToDatabase();
    const collection = db.collection("coinscap");
    const result = await collection.insertMany(newsData, { ordered: false });
    console.log(`Inserted ${result.insertedCount} documents into coinscap`);

    res.status(200).json({
      success: true,
      message: `${result.insertedCount} documents were inserted`,
      data: newsData,
    });
  } catch (error) {
    console.error("Error in /all-news:", error.message);
    console.error("Response:", error.response?.data);
    console.error("Headers:", error.response?.headers);
    res.status(500).json({
      success: false,
      message: "Error fetching or inserting data",
      error: error.message,
      responseData: error.response?.data
    });
  }
});

app.get("/fetch-rss", async (req, res) => {
  const rssUrl = req.query.url || "https://cryptoslate.com/feed/";
  const collectionName = req.query.collection || "rssfeeds";
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (!rssUrl) {
    return res.status(400).json({ success: false, message: "RSS feed URL is required." });
  }

  try {
    const response = await axios.get(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive'
      },
      timeout: 10000
    });
    const parser = new xml2js.Parser();
    parser.parseString(response.data, async (err, result) => {
      if (err) {
        console.error("XML parsing error:", err);
        return res.status(500).json({ success: false, message: "Failed to parse XML", error: err.message });
      }

      if (!result.rss || !result.rss.channel || !result.rss.channel[0].item) {
        console.error("No items found in RSS feed:", rssUrl);
        return res.status(200).json({ success: true, message: "No items in RSS feed", data: [], totalItems: 0 });
      }

      const items = result.rss.channel[0].item.map((item) => ({
        article_id: generateArticleId(item.link[0]),
        title: item.title[0] || "Untitled",
        link: item.link[0],
        keywords: null,
        creator: item["dc:creator"] ? [item["dc:creator"][0] || "Unknown"] : ["Unknown"],
        video_url: null,
        description: item.description ? stripHtmlTags(item.description[0]) : "No description available",
        content: item["content:encoded"] ? stripHtmlTags(item["content:encoded"][0]) : null,
        pubDate: formatDate(item.pubDate[0]) || new Date().toISOString(),
        pubDateTZ: "UTC",
        image_url: extractImageUrl(item) || "/default.png?height=200&width=400&text=News",
        source_id: generateSourceId(rssUrl),
        source_priority: Math.floor(Math.random() * 1000000) + 1000,
        source_name: result.rss.channel[0].title[0],
        source_url: result.rss.channel[0].link[0],
        source_icon: null,
        language: "english",
        country: ["global"],
        category: ["cryptocurrency"],
        ai_tag: ["crypto news"],
        ai_region: null,
        ai_org: null,
      }));

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = items.slice(startIndex, endIndex);

      const db = await connectToDatabase();
      const collection = db.collection(collectionName);

      for (const item of paginatedItems) {
        try {
          const existingItem = await collection.findOne({ link: item.link });
          if (!existingItem) {
            await collection.insertOne(item);
            console.log(`Inserted article: ${item.title} into ${collectionName}`);
          } else {
            console.log(`Duplicate article found: ${item.title} in ${collectionName}`);
          }
        } catch (error) {
          console.error(`Failed to insert article ${item.title} into ${collectionName}:`, error.message);
          throw error;
        }
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
    console.error("Error in /fetch-rss:", error.message);
    console.error("Response:", error.response?.data);
    console.error("Headers:", error.response?.headers);
    res.status(500).json({
      success: false,
      message: "Failed to fetch RSS feed",
      error: error.message,
      responseData: error.response?.data
    });
  }
});

app.get("/fetch-another-rss", async (req, res) => {
  const rssUrl = "https://www.newsbtc.com/feed/";
  const collectionName = "rssfeeds1";
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;

  try {
    // Optional: Use proxy if 403 persists
    // const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    // const response = await axios.get(proxyUrl, { headers: { 'User-Agent': '...' } });
    const response = await axios.get(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive'
      },
      timeout: 10000
    });
    const parser = new xml2js.Parser();
    parser.parseString(response.data, async (err, result) => {
      if (err) {
        console.error("XML parsing error:", err);
        return res.status(500).json({ success: false, message: "Failed to parse XML", error: err.message });
      }

      if (!result.rss || !result.rss.channel || !result.rss.channel[0].item) {
        console.error("No items found in RSS feed:", rssUrl);
        return res.status(200).json({ success: true, message: "No items in RSS feed", data: [], totalItems: 0 });
      }

      const items = result.rss.channel[0].item.map((item) => ({
        article_id: generateArticleId(item.link[0]),
        title: item.title[0] || "Untitled",
        link: item.link[0],
        keywords: null,
        creator: item["dc:creator"] ? [item["dc:creator"][0] || "Unknown"] : ["Unknown"],
        video_url: null,
        description: item.description ? stripHtmlTags(item.description[0]) : "No description available",
        content: item["content:encoded"] ? stripHtmlTags(item["content:encoded"][0]) : null,
        pubDate: formatDate(item.pubDate[0]) || new Date().toISOString(),
        pubDateTZ: "UTC",
        image_url: extractImageUrl(item) || "/default.png?height=200&width=400&text=News",
        source_id: generateSourceId(rssUrl),
        source_priority: Math.floor(Math.random() * 1000000) + 1000,
        source_name: result.rss.channel[0].title[0],
        source_url: result.rss.channel[0].link[0],
        source_icon: null,
        language: "english",
        country: ["global"],
        category: ["cryptocurrency"],
        ai_tag: ["crypto news"],
        ai_region: null,
        ai_org: null,
      }));

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = items.slice(startIndex, endIndex);

      const db = await connectToDatabase();
      const collection = db.collection(collectionName);

      for (const item of paginatedItems) {
        try {
          const existingItem = await collection.findOne({ link: item.link });
          if (!existingItem) {
            await collection.insertOne(item);
            console.log(`Inserted article: ${item.title} into ${collectionName}`);
          } else {
            console.log(`Duplicate article found: ${item.title} in ${collectionName}`);
          }
        } catch (error) {
          console.error(`Failed to insert article ${item.title} into ${collectionName}:`, error.message);
          throw error;
        }
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
    console.error("Error in /fetch-another-rss:", error.message);
    console.error("Response:", error.response?.data);
    console.error("Headers:", error.response?.headers);
    res.status(500).json({
      success: false,
      message: "Failed to fetch RSS feed",
      error: error.message,
      responseData: error.response?.data
    });
  }
});

app.get("/trending-news", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const coinscapCollection = db.collection("coinscap");
    const rssfeedsCollection = db.collection("rssfeeds");
    const rssfeeds1Collection = db.collection("rssfeeds1");

    const coinscapItems = await coinscapCollection
      .find({})
      .sort({ pubDate: -1 })
      .limit(5)
      .toArray();
    const rssItems = await rssfeedsCollection
      .find({})
      .sort({ pubDate: -1 })
      .limit(5)
      .toArray();
    const rssItems1 = await rssfeeds1Collection
      .find({})
      .sort({ pubDate: -1 })
      .limit(5)
      .toArray();

    const trendingItems = [...coinscapItems, ...rssItems, ...rssItems1]
      .map(item => ({
        title: item.title || "Untitled",
        description: item.description || item.content || "No description available",
        creator: [item.author || (item.creator && item.creator[0]) || "Unknown"],
        pubDate: item.pubDate || new Date().toISOString(),
        image_url: item.image_url || item.image || "/default.png?height=200&width=400&text=News",
      }))
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, 5);

    console.log(`Fetched ${trendingItems.length} trending news items`);

    res.status(200).json({
      success: true,
      message: "Fetched trending news items",
      data: trendingItems,
    });
  } catch (error) {
    console.error("Error in /trending-news:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching trending news",
      error: error.message,
    });
  }
});

app.get("/blogs", (req, res) => {
  const blogs = [
    {
      title: "Comprehensive Guide To Crafting A Metaverse Avatar",
      description: "In the fascinating realm of the metaverse, crafting a digital avatar is key to translating your virtual identity...",
      author: "Contributor Author",
      date: "April 16, 2024",
      image: "/web3.png?height=200&width=400&text=Metaverse",
    },
  ];
  res.status(200).json({ success: true, data: blogs });
});

app.get("/check-oplog", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const stats = await db.collection("oplog.rs").stats();
    res.status(200).json({ success: true, oplogSize: stats.size / (1024 * 1024) + " MB" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/clear-old-rss", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const collections = ["rssfeeds", "rssfeeds1"];
    for (const coll of collections) {
      const result = await db.collection(coll).deleteMany({
        pubDate: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });
      console.log(`Deleted ${result.deletedCount} old items from ${coll}`);
    }
    res.status(200).json({ success: true, message: "Cleared old RSS data" });
  } catch (error) {
    console.error("Error clearing old data:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/backup-rss", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const collections = ["rssfeeds", "rssfeeds1"];
    const backup = {};
    for (const coll of collections) {
      backup[coll] = await db.collection(coll).find({}).toArray();
    }
    res.status(200).json({ success: true, data: backup });
  } catch (error) {
    console.error("Backup error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/", async (req, res) => {
  const { urls } = req.body;
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: "Invalid input. Please provide an array of URLs." });
  }
  try {
    const jsonData = await fetchRssToJson(urls);
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return res.status(400).json({ error: "No valid data to insert." });
    }
    const db = await connectToDatabase();
    const collection = db.collection("rssfeeds");
    const result = await collection.insertMany(jsonData, { ordered: false });
    res.json({ success: true, insertedCount: result.insertedCount, data: jsonData });
  } catch (error) {
    console.error("Error saving RSS data to MongoDB:", error.message);
    res.status(500).json({ error: "An error occurred while processing the feeds.", details: error.message });
  }
});

async function fetchRssToJson(urls) {
  const jsonResults = [];
  const rssFeedUrl = "https://thedefiant.io/feed/";
  urls.push(rssFeedUrl);
  const db = await connectToDatabase();
  const collection = db.collection("rssfeeds");
  for (const url of urls) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 10000
      });
      const xml = response.data;
      const result = await xml2js.parseStringPromise(xml);
      jsonResults.push(result);
      await collection.insertOne(result);
      console.log(`1 document was inserted for URL: ${url}`);
    } catch (error) {
      console.error(`Error fetching or parsing ${url}:`, error.message);
      console.error("Response:", error.response?.data);
      console.error("Headers:", error.response?.headers);
    }
  }
  return jsonResults;
}

function generateArticleId(url) {
  return crypto.createHash("md5").update(url).digest("hex");
}

function formatDate(dateStr) {
  return new Date(dateStr).toISOString().replace("T", " ").slice(0, 19);
}

function extractImageUrl(item) {
  if (item["media:content"]) {
    return item["media:content"][0].$.url;
  }
  if (item.enclosure) {
    return item.enclosure[0].$.url;
  }
  if (item["content:encoded"]) {
    const content = item["content:encoded"][0];
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
      .replace("www.", "")
      .replace(".com", "")
      .replace(".org", "")
      .replace(/\./g, "_");
    return domain.toLowerCase();
  } catch {
    return "unknown_source";
  }
}

function stripHtmlTags(html) {
  if (!html) return null;
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

const PORT = process.env.PORT || 10000; // Updated to match Render logs
app.listen(PORT, async () => {
  try {
    await connectToDatabase();
    console.log(`Server is running on http://localhost:${PORT}`);
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
});