const pool = require('../backend/lib/db');

async function createListing(data, connection = null) {
  const db = connection || pool;

  const query = `
    INSERT INTO listings (
      id, user_id, title, description, category,
      price, unit, quantity_available, city, state,
      latitude, longitude
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    data.id,
    data.user_id,
    data.title,
    data.description,
    data.category,
    data.price,
    data.unit,
    data.quantity_available,
    data.city,
    data.state,
    data.latitude || null,
    data.longitude || null
  ];

  await db.query(query, values);
  await db.query(
    "INSERT IGNORE INTO listing_stats (listing_id) VALUES (?)",
    [data.id]
  );
  return data;
}

async function getById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM listings WHERE id = ? AND status != "deleted"',
    [id]
  );

  return rows[0] || null;
}

async function search(filters) {
  const values = [];
  
  let query = `
    SELECT
      id,
      title,
      category,
      price,
      city,
      state,
      latitude,
      longitude,
    (
      6371 * acos(
        cos(radians(?)) *
        cos(radians(latitude)) *
        cos(radians(longitude) - radians(?)) +
        sin(radians(?)) *
        sin(radians(latitude))
      )
    ) AS distance_km
    FROM listings
    WHERE status = 'active'
      AND moderation_status = 'approved'
  `;

  const lat = filters.lat ? Number(filters.lat) : null;
  const lng = filters.lng ? Number(filters.lng) : null;
  const radius = filters.radius ? Number(filters.radius) : null;

  if (lat && lng) {
    values.push(lat, lng, lat);
  } else {
    // valores dummy para manter placeholders
    values.push(0, 0, 0);
  }

  if (filters.category) {
    query += ` AND category = ?`;
    values.push(filters.category);
  }

  if (filters.minPrice) {
    query += ` AND price >= ?`;
    values.push(filters.minPrice);
  }

  if (filters.maxPrice) {
    query += ` AND price <= ?`;
    values.push(filters.maxPrice);
  }

  if (filters.city) {
    query += ` AND city = ?`;
    values.push(filters.city);
  }

  if (filters.state) {
    query += ` AND state = ?`;
    values.push(filters.state);
  }

  if (lat && lng && radius) {
    query += ` HAVING distance_km <= ?`;
    values.push(radius);
  }

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 20;
  const offset = (page - 1) * limit;

  if (lat && lng) {
    query += ` ORDER BY distance_km ASC, price ASC, created_at DESC`;
  } else {
    query += ` ORDER BY price ASC, created_at DESC`;
  }

  query += ` LIMIT ? OFFSET ?`;

  values.push(limit, offset);

  const [rows] = await pool.query(query, values);
  return rows;
}

async function softDelete(id) {
  await pool.query(
    `UPDATE listings 
     SET status = 'deleted' 
     WHERE id = ?`,
    [id]
  );
}

async function updateListing(id, data, connection = null) {
  const db = connection || pool;

  const query = `
    UPDATE listings
    SET title = ?, 
        description = ?, 
        category = ?, 
        price = ?, 
        unit = ?, 
        quantity_available = ?, 
        city = ?, 
        state = ?
    WHERE id = ?
  `;

  const values = [
    data.title,
    data.description,
    data.category,
    data.price,
    data.unit,
    data.quantity_available,
    data.city,
    data.state,
    id
  ];

  await db.query(query, values);
}

async function updateStatus(id, status) {
  await pool.query(
    `UPDATE listings SET status = ? WHERE id = ?`,
    [status, id]
  );
}

module.exports = {
  createListing,
  getById,
  updateListing,
  softDelete,
  search,
  updateStatus
};
