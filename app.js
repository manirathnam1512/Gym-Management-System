const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const port = 3000;

// Add an admin user manually (skip this step if using the UI):

// Database setup
let db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            password TEXT,
            is_admin INTEGER DEFAULT 0  -- 0 means not admin, 1 means admin
            )`);
        }
    });
    
// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Session setup
app.use(session({
    secret: '12345', // Secret for signing the session ID
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Middleware to check if the user is an admin
function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.is_admin) {
        next(); // User is admin, proceed to the next middleware/route
    } else {
        res.status(403).send('Access denied. Only admins can access this page.');
    }
}


// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/views/register.html');
});

app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    const query = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;
    db.run(query, [name, email, password], (err) => {
        if (err) {
            return res.send('Error: User already exists');
        }
        res.redirect('/login');
    });
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/views/login.html');
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = `SELECT * FROM users WHERE email = ? AND password = ?`;
    db.get(query, [email, password], (err, user) => {
        if (user) {
            // Store user data in session, including is_admin flag
            req.session.user = { 
                id: user.id, 
                name: user.name, 
                email: user.email,
                is_admin: user.is_admin // Add is_admin to session
            };
            res.redirect('/profile');
        } else {
            res.send('Invalid credentials');
        }
    });
});


app.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login'); // Redirect if user is not logged in
    }

    res.sendFile(__dirname + '/views/profile.html');
});

// API route to fetch user details for the profile page
app.get('/api/user', (req, res) => {
    if (!req.session.user) {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(req.session.user);
});

// Admin Dashboard
// Protect the dashboard route so that only admins can access it
app.get('/dashboard', isAdmin, (req, res) => {
    db.all(`SELECT name, email FROM users`, [], (err, rows) => {
        if (err) {
            throw err;
        }
        let userList = rows.map(user => `<li>${user.name} - ${user.email}</li>`).join('');
        res.send(`
            <h1>Admin Dashboard</h1>
            <ul>${userList}</ul>
        `);
    });
});


// Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
