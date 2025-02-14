-- File: backend/src/db/schema.sql
CREATE TABLE bible_versions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE bible_books (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  abbreviation VARCHAR(10)
);

CREATE TABLE bible_verses (
  id SERIAL PRIMARY KEY,
  book_id INTEGER REFERENCES bible_books(id),
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  version_id INTEGER REFERENCES bible_versions(id),
  text TEXT NOT NULL,
  UNIQUE(book_id, chapter, verse, version_id)
);

-- Create indexes for performance
CREATE INDEX idx_verses_lookup ON bible_verses(book_id, chapter, verse, version_id);
CREATE INDEX idx_verses_text ON bible_verses USING gin(to_tsvector('english', text));

-- Insert sample versions
INSERT INTO bible_versions (code, name) VALUES
  ('NIV', 'New International Version'),
  ('AMPC', 'Amplified Bible, Classic Edition');

-- Insert sample books
INSERT INTO bible_books (name, abbreviation) VALUES
  ('James', 'Jas'),
  ('Romans', 'Rom');

-- Insert sample verses
INSERT INTO bible_verses (book_id, chapter, verse, version_id, text) VALUES
  (1, 1, 2, 2, 'Consider it wholly joyful, my brethren, whenever you are enveloped in or encounter trials of any sort or fall into various temptations.'),
  (2, 8, 28, 1, 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.');