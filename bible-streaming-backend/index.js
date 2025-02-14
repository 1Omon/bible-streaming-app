// backend/server.js
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const { Configuration, OpenAIApi } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pool } = require('pg');
require('dotenv').config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Initialize OpenAI
const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY
  })
);

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Audio processing class
class AudioProcessor {
  constructor(ws) {
    this.ws = ws;
    this.chunks = [];
    this.processingInterval = setInterval(() => this.processChunks(), 1000);
  }

  addChunk(chunk) {
    this.chunks.push({
      buffer: chunk,
      timestamp: Date.now()
    });
  }

  cleanup() {
    clearInterval(this.processingInterval);
  }

  async processChunks() {
    if (this.chunks.length === 0) return;

    try {
      // Combine audio chunks
      const audioBuffer = Buffer.concat(
        this.chunks.map(chunk => chunk.buffer)
      );

      // Transcribe audio
      const transcription = await this.transcribeAudio(audioBuffer);

      // Detect verse references
      const verseReference = await this.detectVerseReference(transcription);

      if (verseReference) {
        // Fetch verse from database
        const verse = await this.fetchVerse(verseReference);
        
        if (verse) {
          this.ws.send(JSON.stringify({
            type: 'verse',
            verse
          }));
        }
      }

      // Clear processed chunks
      this.chunks = [];
    } catch (error) {
      console.error('Error processing audio:', error);
    }
  }

  async transcribeAudio(audioBuffer) {
    const response = await openai.createTranscription(
      new Blob([audioBuffer], { type: 'audio/webm' }),
      'whisper-1',
      undefined,
      undefined,
      0.2,
      'en'
    );

    return response.data.text;
  }

  async detectVerseReference(text) {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
      Extract Bible verse references from this text.
      Return in format "Book Chapter:Verse" or null if none found.
      Text: ${text}
    `;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    return response !== 'null' ? response : null;
  }

  async fetchVerse(reference) {
    const [book, chapterVerse] = reference.split(' ');
    const [chapter, verse] = chapterVerse.split(':');

    const query = `
      SELECT b.name || ' ' || v.chapter || ':' || v.verse as reference,
             ver.code as version,
             v.text
      FROM bible_verses v
      JOIN bible_books b ON v.book_id = b.id
      JOIN bible_versions ver ON v.version_id = ver.id
      WHERE b.name = $1 
      AND v.chapter = $2 
      AND v.verse = $3
      LIMIT 1
    `;

    const result = await pool.query(query, [book, chapter, verse]);
    return result.rows[0];
  }
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  const processor = new AudioProcessor(ws);

  ws.on('message', (data) => {
    processor.addChunk(data);
  });

  ws.on('close', () => {
    processor.cleanup();
    console.log('Client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});