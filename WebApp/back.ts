// Backend in TypeScript with Express and MQTT

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import mqtt from 'mqtt';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI as string)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// User schema and model
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    role: String
});
const User = mongoose.model('User', userSchema);

// Image metadata schema and model
const imageSchema = new mongoose.Schema({
    filename: String,
    timestamp: Date,
    device: String,
    cameraParams: Object
});
const Image = mongoose.model('Image', imageSchema);

// MQTT Client Setup
const mqttClient = mqtt.connect(process.env.MQTT_BROKER as string, {
    clientId: 'mqtt_server',
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASSWORD
});

mqttClient.on('connect', () => {
    console.log('Connected to MQTT Broker');
    mqttClient.subscribe('device/images');
});

mqttClient.on('message', (topic, message) => {
    const data = JSON.parse(message.toString());
    const { image, device, cameraParams } = data;
    
    const buffer = Buffer.from(image, 'base64');
    const filename = `${Date.now()}-${device}.jpg`;
    const filePath = path.join(uploadDir, filename);
    
    fs.writeFileSync(filePath, buffer);
    
    const newImage = new Image({
        filename,
        timestamp: new Date(),
        device,
        cameraParams
    });
    newImage.save();
    console.log(`Image saved: ${filename}`);
});

// User authentication
app.post('/register', async (req, res) => {
    const { username, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, role });
    await user.save();
    res.json({ message: 'User registered successfully' });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    res.json({ token });
});

// Serve saved images
app.use('/uploads', express.static(uploadDir));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
