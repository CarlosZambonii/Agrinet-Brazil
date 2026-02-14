const pool = require("../lib/db");

async function create(listing) {
  const {
    id,
    userId,
    title,
    category,
    description,
    price,
    location
  } = listing;

  await pool.query(
    `
    INSERT INTO listings
    (id, user_id, title, category, description, price, location)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [id, userId, title, category, description, price || null, location || null]
  );

  return listing;
}

async function upsert(listing) {
  await pool.query(
    `
    INSERT INTO listings (id, title)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title)
    `,
    [
      listing.id,
      listing.title || listing.listing_title
    ]
  );
}

async function findAll() {
  const [rows] = await pool.query(`
    SELECT
      id,
      user_id AS userId,
      title,
      category,
      description,
      price,
      location,
      created_at AS createdAt
    FROM listings
    ORDER BY created_at DESC
  `);

  return rows;
}

module.exports = {
  create,
  findAll,
  upsert
};
