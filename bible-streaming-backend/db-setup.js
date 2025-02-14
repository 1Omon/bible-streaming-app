// backend/db-setup.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function setupDatabase() {
  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bible_versions (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bible_books (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        abbreviation VARCHAR(10)
      );

      CREATE TABLE IF NOT EXISTS bible_verses (
        id SERIAL PRIMARY KEY,
        book_id INTEGER REFERENCES bible_books(id),
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        version_id INTEGER REFERENCES bible_versions(id),
        text TEXT NOT NULL,
        UNIQUE(book_id, chapter, verse, version_id)
      );

      CREATE INDEX IF NOT EXISTS idx_verses_lookup 
        ON bible_verses(book_id, chapter, verse, version_id);
    `);

    // Insert sample data
    await pool.query(`
      INSERT INTO bible_versions (code, name) 
      VALUES 
        ('NIV', 'New International Version'),
        ('AMPC', 'Amplified Bible, Classic Edition')
      ON CONFLICT (code) DO NOTHING;

      INSERT INTO bible_books (name, abbreviation)
      VALUES
        ('James', 'Jas'),
        ('Romans', 'Rom')
      ON CONFLICT DO NOTHING;
    `);

    // Insert sample verses
    const versesData = [
      {
        book: 'James',
        chapter: 1,
        verse: 2,
        version: 'AMPC',
        text: 'Consider it wholly joyful, my brethren, whenever you are enveloped in or encounter trials of any sort or fall into various temptations.'
      },
      {
        book: 'Romans',
        chapter: 8,
        verse: 28,
        version: 'NIV',
        text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.'
      }
    ];

    for (const verse of versesData) {
      await pool.query(`
        INSERT INTO bible_verses (book_id, chapter, verse, version_id, text)
        SELECT 
          b.id,
          $1,
          $2,
          v.id,
          $3
        FROM bible_books b, bible_versions v
        WHERE b.name = $4 AND v.code = $5
        ON CONFLICT DO NOTHING
      `, [verse.chapter, verse.verse, verse.text, verse.book, verse.version]);
    }

    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase();