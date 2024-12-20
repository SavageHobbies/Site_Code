const express = require('express');
const cors = require('cors');
const Parser = require('rss-parser');
const { SignJWT, jwtVerify } = require('jose');

const app = express();
const parser = new Parser();
const port = process.env.PORT || 3001;

// Specific CORS configuration for by1.net
const ALLOWED_ORIGINS = [
  'https://by1.net',
  'https://www.by1.net',
  'http://localhost:3000' // For development
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// RSS Feeds endpoint
app.get('/rss', async (req, res) => {
  try {
    const RSS_FEEDS = [
      'https://feeds.feedburner.com/venturebeat/SZYF',
      'https://www.artificialintelligence-news.com/feed/',
      'https://www.unite.ai/feed/'
    ];

    const feedPromises = RSS_FEEDS.map(feed => parser.parseURL(feed));
    const feeds = await Promise.all(feedPromises);
    const allItems = feeds.flatMap(feed => feed.items);
    
    const sortedItems = allItems.sort((a, b) => {
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    });
    
    res.json({ items: sortedItems.slice(0, 10) });
  } catch (error) {
    console.error('Error fetching RSS feeds:', error);
    res.status(500).json({ error: 'Failed to fetch RSS feeds' });
  }
});

// Auth endpoint
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Replace these credentials with secure ones
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
    const token = await new SignJWT({ username })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);
    
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
