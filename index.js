import express from 'express';
import session from 'express-session';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Login credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

// Middleware to check if user is logged in
const requireAuth = (req, res, next) => {
  if (req.session.isLoggedIn) {
    next();
  } else {
    res.redirect('/');
  }
};

// Routes
app.get('/', (req, res) => {
  if (req.session.isLoggedIn) {
    return res.redirect('/dashboard');
  }
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isLoggedIn = true;
    res.redirect('/dashboard');
  } else {
    res.render('login', { error: 'Invalid username or password' });
  }
});

app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let apiUrl = `${process.env.API_BASE_URL}/api/leads`;
    
    // Add status filter if provided
    if (status && status !== 'all') {
      apiUrl += `?status=${status}`;
    }
    
    // Fetch data from external API
    const response = await axios.get(apiUrl);
    const leads = response.data;
    
    res.render('dashboard', { leads, currentFilter: status || 'all' });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.render('dashboard', { 
      leads: [], 
      currentFilter: 'all',
      error: 'Failed to fetch data from API. Make sure your API server is running on http://localhost:4200' 
    });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Update lead route
app.post('/api/leads/update/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const leadData = req.body;
    
    // Send update request to external API
    const response = await axios.post(
      `${process.env.API_BASE_URL}/api/leads/update/${id}`,
      leadData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update lead' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});