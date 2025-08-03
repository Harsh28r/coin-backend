import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import xml2js from "xml2js";
import { MongoClient } from 'mongodb';
// import postRoutes from '../server/routers/postRoutes.js';
import RssFeed from './schema/APISchema.js';
import crypto from 'crypto';
import router from './controllers/postController.js';

dotenv.config();

const app = express();


// CORS configuration
app.use(cors({
  origin: '*', // Be cautious with this in production
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Routes
app.use('/api/posts', router);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Routes
// app.use('/api/posts', postRoutes);

// New route to handle user data submission
// app.post('/api/user-data', async (req, res) => {
//   const userData = req.body; // Expecting user data in the request body

//   if (!userData || typeof userData !== 'object') {
//     return res.status(400).json({ success: false, message: "Invalid user data." });
//   }

//   try {
//     // Connect to MongoDB
//     await client.connect();
//     const db = client.db('coins'); // Replace with your database name
//     const collection = db.collection('blogdb'); // Replace with your collection name

//     // Insert the user data
//     const result = await collection.insertOne(userData);
//     res.status(201).json({ success: true, message: "User data stored successfully", data: result.ops[0] });
//   } catch (error) {
//     console.error("Error storing user data:", error);
//     res.status(500).json({ success: false, message: "Error storing user data", error: error.message });
//   } finally {
//     // Close the connection
//     await client.close();
//   }
// });

const connectionString ="mongodb://localhost:27017/news" ;  // Ensure this is defined
if (!connectionString) {
    throw new Error("MongoDB connection string is not defined.");
}
const client = new MongoClient(connectionString);
let db;

// Connect to MongoDB
async function connectToDatabase() {
  try {
    console.log("Attempting to connect to MongoDB...");
    await client.connect();
    db = client.db('harshgupta'); // Replace with your database name
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
  }
}


// Helper function for API requests
async function makeApiRequest(url) {
  // Check if the URL is valid before making the request
  if (!url.includes('apikey') || !url.includes('q')) {
    return {
      status: 400,
      success: false,
      message: "Invalid request parameters",
      error: "API key and query parameter 'q' are required.",
    };
  }
  
  try {
    const response = await axios.get(url);
    console.log("API response data:", response.data);
    return {
      status: 200,
      success: true,
      message: "Successfully fetched the data",
      data: response.data.results,
    };
  } catch (error) {
    console.error("API request error:", error.response ? error.response.data : error);
    return {
      status: 500,
      success: false,
      message: "Failed to fetch data from the API",
      error: error.response ? error.response.data : error.message,
      apiErrorMessage: error.response?.data?.results?.message || error.message,
    };
  }
}

app.get("/all-news", async (req, res) => {
  try {
    // Fetch data from the API
    const apiUrl = 'https://newsdata.io/api/1/news?apikey=pub_59933f2b9e474711aac0b2ef00ea887d4ff09&q=crypto%20market&category=business,technology';
  //  const apiUrl='https://gnews.io/api/v4/search?q=crypto&apikey=de835f501509fb7f1394d9503333ee60'
   
    const response = await axios.get(apiUrl);
    const newsData = response.data.results; // Assuming the data is in the 'results' field

    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    // Select the database and collection
    const db = client.db('coins'); // Ensure this matches your database name
    const collection = db.collection('coinscap'); // Replace with your collection name
   

    // Insert the JSON data
    const result = await collection.insertMany(newsData);
    console.log(`${result.insertedCount} documents were inserted`);

    res.status(200).json({ success: true, message: `${result.insertedCount} documents were inserted`, data: newsData });
  } catch (error) {
    console.error("Error fetching or inserting data:", error);
    res.status(500).json({ success: false, message: "Error fetching or inserting data", error: error.message });
  } finally {
    // Close the connection
    await client.close();
  }
});

app.get("/fetch-rss", async (req, res) => {
  const rssUrl = req.query.url || 'https://cryptoslate.com/feed/';
  const page = parseInt(req.query.page) || 1; // Default to page 1
  const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page

  if (!rssUrl) {
    return res.status(400).json({ success: false, message: "RSS feed URL is required." });
  }

  try {
    const response = await axios.get(rssUrl);
    const parser = new xml2js.Parser();
    parser.parseString(response.data, async (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to parse XML", error: err });
      }

      // Transform RSS items into the desired format
      const items = result.rss.channel[0].item.map(item => ({
        article_id: generateArticleId(item.link[0]),
        title: item.title[0],
        link: item.link[0],
        keywords: null,
        creator: item['dc:creator'] ? [item['dc:creator'][0]] : null,
        video_url: null,
        description: item.description ? stripHtmlTags(item.description[0]) : null,
        content: item['content:encoded'] ? stripHtmlTags(item['content:encoded'][0]) : null,
        pubDate: formatDate(item.pubDate[0]),
        pubDateTZ: "UTC",
        image_url: extractImageUrl(item),
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
        ai_org: null
      }));

      // Implement pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = items.slice(startIndex, endIndex);

      // Connect to MongoDB
      await client.connect();
      const db = client.db('coins'); // Your database name
      const collection = db.collection('rssfeeds');

      // Insert the items, avoiding duplicates based on title and pubDate
      for (const item of paginatedItems) {
        try {
          const existingItem = await collection.findOne({ 
            title: item.title, 
            pubDate: item.pubDate 
          });
          if (!existingItem) {
            await collection.insertOne(item);
            console.log(`Inserted article: ${item.title}`);
          } else {
            console.log(`Duplicate article found: ${item.title}`);
          }
        } catch (error) {
          console.error('Error inserting article:', error);
        }
      }

      res.status(200).json({
        success: true,
        message: "Fetched and processed RSS feed items",
        data: paginatedItems,
        totalItems: items.length,
        currentPage: page,
        totalPages: Math.ceil(items.length / limit)
      });
    });
  } catch (error) {
    console.error("Error fetching RSS feed:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch RSS feed",
      error: error.message
    });
  }
});

app.get("/fetch-another-rss", async (req, res) => {
  const rssUrl = req.query.url || 'https://www.newsbtc.com/feed/'; 
  const page = parseInt(req.query.page) || 1; // Default to page 1
  const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page

  if (!rssUrl) {
    return res.status(400).json({ success: false, message: "RSS feed URL is required." });
  }

  try {
    const response = await axios.get(rssUrl);
    const parser = new xml2js.Parser();
    parser.parseString(response.data, async (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to parse XML", error: err });
      }

      // Transform RSS items into the desired format
      const items = result.rss.channel[0].item.map(item => ({
        article_id: generateArticleId(item.link[0]),
        title: item.title[0],
        link: item.link[0],
        keywords: null,
        creator: item['dc:creator'] ? [item['dc:creator'][0]] : null,
        video_url: null,
        description: item.description ? stripHtmlTags(item.description[0]) : null,
        content: item['content:encoded'] ? stripHtmlTags(item['content:encoded'][0]) : null,
        pubDate: formatDate(item.pubDate[0]),
        pubDateTZ: "UTC",
        image_url: extractImageUrl(item),
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
        ai_org: null
      }));

      // Implement pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = items.slice(startIndex, endIndex);

      // Connect to MongoDB
      await client.connect();
      const db = client.db('coins'); // Your database name
      const collection = db.collection('rssfeeds1');

      // Insert the items, avoiding duplicates based on title and pubDate
      for (const item of paginatedItems) {
        try {
          const existingItem = await collection.findOne({ 
            title: item.title, 
            pubDate: item.pubDate 
          });
          if (!existingItem) {
            await collection.insertOne(item);
            console.log(`Inserted article: ${item.title}`);
          } else {
            console.log(`Duplicate article found: ${item.title}`);
          }
        } catch (error) {
          console.error('Error inserting article:', error);
        }
      }

      res.status(200).json({
        success: true,
        message: "Fetched and processed RSS feed items",
        data: paginatedItems,
        totalItems: items.length,
        currentPage: page,
        totalPages: Math.ceil(items.length / limit)
      });
    });
  } catch (error) {
    console.error("Error fetching RSS feed:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch RSS feed",
      error: error.message
    });
  }
});

// New route to fetch and store data from the NewsBTC RSS feed
app.get("/fetch-newsbtc-rss", async (req, res) => {
  const rssUrl = 'https://www.newsbtc.com/feed/';
  const page = parseInt(req.query.page) || 1; // Default to page 1
  const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page

  try {
    const response = await axios.get(rssUrl);
    const parser = new xml2js.Parser();
    parser.parseString(response.data, async (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to parse XML", error: err });
      }

      // Transform RSS items into the desired format
      const items = result.rss.channel[0].item.map(item => ({
        article_id: generateArticleId(item.link[0]),
        title: item.title[0],
        link: item.link[0],
        keywords: null,
        creator: item['dc:creator'] ? [item['dc:creator'][0]] : null,
        video_url: null,
        description: item.description ? stripHtmlTags(item.description[0]) : null,
        content: item['content:encoded'] ? stripHtmlTags(item['content:encoded'][0]) : null,
        pubDate: formatDate(item.pubDate[0]),
        pubDateTZ: "UTC",
        image_url: extractImageUrl(item),
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
        ai_org: null
      }));

      // Implement pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = items.slice(startIndex, endIndex);

      // Connect to MongoDB
      await client.connect();
      const db = client.db('coins'); // Your database name
      const collection = db.collection('newsbtc_rssfeeds'); // New collection for NewsBTC RSS feeds

      // Insert the items, avoiding duplicates based on title and pubDate
      for (const item of paginatedItems) {
        try {
          const existingItem = await collection.findOne({ 
            title: item.title, 
            pubDate: item.pubDate 
          });
          if (!existingItem) {
            await collection.insertOne(item);
            console.log(`Inserted article: ${item.title}`);
          } else {
            console.log(`Duplicate article found: ${item.title}`);
          }
        } catch (error) {
          console.error('Error inserting article:', error);
        }
      }

      res.status(200).json({
        success: true,
        message: "Fetched and processed NewsBTC RSS feed items",
        data: paginatedItems,
        totalItems: items.length,
        currentPage: page,
        totalPages: Math.ceil(items.length / limit)
      });
    });
  } catch (error) {
    console.error("Error fetching NewsBTC RSS feed:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch NewsBTC RSS feed",
      error: error.message
    });
  }
});

// Helper functions
function generateArticleId(url) {
 return crypto.createHash('md5').update(url + Date.now()).digest('hex'); 
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
  // Try to extract from content if available
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
  // Extract domain name from URL and use it as source_id
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

function detectLanguage(text) {
  // Simple language detection - you might want to use a proper language detection library
  // This is just a basic example
  return "english"; // Default to English for now
}

// Function to fetch and convert RSS to JSON
async function fetchRssToJson(urls) {
    const jsonResults = [];

    // Add the RSS feed URL
    const rssFeedUrl = 'https://thedefiant.io/feed/';
    urls.push(rssFeedUrl); // Include the RSS feed URL in the list

    for (const url of urls) {
        try {
            const response = await axios.get(url, { timeout: 10000 });
            const xml = response.data;
            const result = await xml2js.parseStringPromise(xml);
            jsonResults.push(result);

            // Connect to MongoDB
            await client.connect();
            console.log("Connected to MongoDB");

            // Select the database and collection
            const db = client.db('coins'); // Ensure this matches your database name
            const collection = db.collection('rssfeeds'); // Replace with your collection name

            // Insert the parsed RSS data
            const insertResult = await collection.insertOne(result);
            console.log(`1 document was inserted for URL: ${url}`);
        } catch (error) {
            console.error(`Error fetching or parsing ${url}:`, error);
        }
    }

    return jsonResults;
}

// API endpoint to convert RSS feeds to JSON and save to MongoDB
app.post('/', async (req, res) => {
    const { urls } = req.body; // Expecting an array of URLs in the request body

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'Invalid input. Please provide an array of URLs.' });
    }

    try {
        const jsonData = await fetchRssToJson(urls);

        // Check if jsonData is an array and has valid objects
        if (!Array.isArray(jsonData) || jsonData.length === 0) {
            return res.status(400).json({ error: 'No valid data to insert.' });
        }

        // Log the data to be inserted for debugging
        console.log("Inserting JSON data into MongoDB:", JSON.stringify(jsonData, null, 2));

        // Save data to MongoDB using the RssFeed model
        const result = await RssFeed.insertMany(jsonData); // Use the RssFeed model to insert the JSON data

        res.json({ success: true, insertedCount: result.length, data: result });
    } catch (error) {
        console.error("Error saving RSS data to MongoDB:", error);
        res.status(500).json({ error: 'An error occurred while processing the feeds.', details: error.message });
    }
});

// Function to refresh RSS feeds
async function refreshRssFeeds() {
  const defaultRssUrls = [
    'https://cryptoslate.com/feed/',
    // 'https://thedefiant.io/feed/'
  ];

  let mongoClient = null;
  try {
    // Create a single MongoDB connection outside the loop
    mongoClient = new MongoClient(connectionString);
    await mongoClient.connect();
    const db = mongoClient.db('coins');
    const collection = db.collection('rssfeeds');
    
    console.log('Refreshing RSS feeds...');
    for (const url of defaultRssUrls) {
      try {
        const response = await axios.get(url);
        const parser = new xml2js.Parser();
        const result = await new Promise((resolve, reject) => {
          parser.parseString(response.data, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });

        // Transform RSS items into the desired format
        const items = result.rss.channel[0].item.map(item => ({
          article_id: generateArticleId(item.link[0]),
          title: item.title[0],
          link: item.link[0],
          keywords: null,
          creator: item['dc:creator'] ? [item['dc:creator'][0]] : null,
          video_url: null,
          description: item.description ? stripHtmlTags(item.description[0]) : null,
          content: item['content:encoded'] ? stripHtmlTags(item['content:encoded'][0]) : null,
          pubDate: formatDate(item.pubDate[0]),
          pubDateTZ: "UTC",
          image_url: extractImageUrl(item),
          source_id: generateSourceId(url),
          source_priority: Math.floor(Math.random() * 1000000) + 1000,
          source_name: result.rss.channel[0].title[0],
          source_url: result.rss.channel[0].link[0],
          source_icon: null,
          language: "english",
          country: ["global"],
          category: ["cryptocurrency"],
          ai_tag: ["crypto news"],
          ai_region: null,
          ai_org: null
        }));

        // Insert the items, avoiding duplicates based on title and pubDate
        for (const item of items) {
          try {
            const existingItem = await collection.findOne({ 
              title: item.title, 
              pubDate: item.pubDate 
            });
            if (!existingItem) {
              await collection.insertOne(item);
              console.log(`Inserted article: ${item.title}`);
            } else {
              console.log(`Duplicate article found: ${item.title}`);
            }
          } catch (error) {
            console.error('Error inserting article:', error);
          }
        }
      } catch (error) {
        console.error(`Error refreshing RSS feed for ${url}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in refresh cycle:', error);
  } finally {
    // Close connection only once after all operations are complete
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

// New endpoint to fetch dummy blog data
app.get("/blogs", (req, res) => {
  // Dummy blog data
  const blogs = [
    {
      title: "Comprehensive Guide To Crafting A Metaverse Avatar",
      description: "In the fascinating realm of the metaverse, crafting a digital avatar is key to translating your virtual identity...",
      author: "Contributor Author",
      date: "April 16, 2024",
      image: "/web3.png?height=200&width=400&text=Metaverse"
    },
    {
      title: "Why Crypto Investment Is More Accessible Than Ever",
      description: "It's been a mere few years to be a cryptocurrency user. Not only are we seeing the expanding...",
      author: "Contributor Author",
      date: "April 09, 2024",
      image: "/web3_1.png?height=200&width=400&text=Crypto+Investment"
    },
    {
      title: "10 Most Popular Cryptocurrency Lawyers Of 2024",
      description: "While more and more people are investing in cryptocurrencies...",
      author: "Contributor Author",
      date: "April 19, 2024",
      image: "/web3_2.png?height=200&width=400&text=Crypto+Lawyers"
    },
    {
      title: "Meme Coins In Sharp Decline Post BTC Flash Crash",
      description: "Meme-based digital assets often experience sharp fluctuations, mirroring the...",
      author: "David Ayton",
      date: "March 21, 2024",
      image: "/image.png?height=200&width=400&text=Bitcoin+Crash"
    },
    {
      title: "4 Ways To Keep Your Business Building Protected At All Times",
      description: "It doesn't matter what kind of business you run, safety is always going to be...",
      author: "Tracy D'Souza",
      date: "March 16, 2024",
      image: "/trd1.png?height=200&width=400&text=Business+Security"
    },
    {
      title: "Unveiling The Ethereum Dencun Upgrade: A Stepping Stone Towards Scalability",
      description: "Ethereum, the prominent platform for decentralized applications...",
      author: "Rozan Khan",
      date: "March 15, 2024",
      image: "/trd2.png?height=200&width=400&text=Ethereum+Upgrade"
    }
  ];

  res.status(200).json({ success: true, data: blogs });
});

// Existing route to handle fetching posts
app.get('/api/posts', async (req, res) => {
  try {
    await client.connect();
    const db = client.db('coins'); // Ensure this matches your database name
    const collection = db.collection('adminPosts'); // Ensure this matches your collection name

    const posts = await collection.find({}).toArray(); // Fetch all posts
    res.status(200).json({ success: true, data: posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ success: false, message: "Error fetching posts", error: error.message });
  } finally {
    await client.close();
  }
});

// Existing route to handle creating posts
app.post('/api/posts', async (req, res) => {
  const adminData = req.body; // Expecting admin data in the request body

  console.log("Received data for creating post:", adminData); // Log the received data

  if (!adminData || typeof adminData !== 'object') {
    return res.status(400).json({ success: false, message: "Invalid admin data." });
  }

  try {
    await client.connect();
    const db = client.db('coins'); // Ensure this matches your database name
    const collection = db.collection('adminPosts'); // Ensure this matches your collection name for admin posts

    const result = await collection.insertOne(adminData);
    res.status(201).json({ success: true, message: "Admin data stored successfully", data: result.ops[0] });
  } catch (error) {
    console.error("Error storing admin data:", error);
    res.status(500).json({ success: false, message: "Error storing admin data", error: error.message });
  } finally {
    await client.close();
  }
});

// New route to handle search across all collections
app.get('/api/search', async (req, res) => {
  const { query } = req.query; // Get the search query from the request

  if (!query) {
    return res.status(400).json({ success: false, message: "Search query is required." });
  }

  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    const db = client.db('coins'); // Ensure this matches your database name

    // Get all collection names
    const collections = await db.listCollections().toArray();
    const searchResults = [];

    console.log(`Searching for query: ${query} in all collections`);
    for (const collectionInfo of collections) {
      const collection = db.collection(collectionInfo.name);
      const results = await collection.find({
        $or: [
          { title: { $regex: query, $options: 'i' } }, // Case-insensitive search
          { description: { $regex: query, $options: 'i' } }
        ]
      }).toArray();

      if (results.length > 0) {
        searchResults.push({ collection: collectionInfo.name, results });
      }
    }

    console.log(`Found results in ${searchResults.length} collections`);
    res.status(200).json({ success: true, data: searchResults });
  } catch (error) {
    console.error("Error performing search:", error);
    res.status(500).json({ success: false, message: "Error performing search", error: error.message });
  } finally {
    console.log("Closing MongoDB connection...");
    await client.close();
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    await connectToDatabase(); // Connect to MongoDB before starting the server
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Add this helper function with the other helper functions
function stripHtmlTags(html) {
  if (!html) return null;
  // Remove HTML tags and decode HTML entities
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .trim(); // Remove leading/trailing whitespace
}


