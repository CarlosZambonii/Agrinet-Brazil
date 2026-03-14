const { randomUUID } = require("crypto");
const listingRepository = require('../repositories/listingRepository');
const pool = require('../backend/lib/db');
const { searchQueriesTotal } = require('../backend/lib/metrics');

async function createListing(data) {
  if (!data.price || data.price <= 0) {
    throw new Error('Invalid price');
  }

  if (data.quantity_available < 0) {
    throw new Error('Invalid quantity');
  }

  const listing = {
    ...data,
    id: randomUUID()
  };

  return listingRepository.createListing(listing);
}

async function getListing(id) {
  return listingRepository.getById(id);
}

async function searchListings(queryParams) {
  searchQueriesTotal.inc();
  return listingRepository.search(queryParams);
}

async function deleteListing(id, userId) {
  const listing = await listingRepository.getById(id);

  if (!listing) {
    throw new Error('Listing not found');
  }

  if (listing.user_id !== userId) {
    throw new Error('Not authorized');
  }

  await listingRepository.softDelete(id);
}

async function updateListing(id, userId, data) {
  const listing = await listingRepository.getById(id);

  if (!listing) {
    throw new Error('Listing not found');
  }

  if (listing.user_id !== userId) {
    throw new Error('Not authorized');
  }

  const [rows] = await pool.query(
    `SELECT COUNT(*) as count
     FROM transactions
     WHERE listing_id = ?
     AND status IN ('pending','paid')`,
    [id]
  );

  if (rows[0].count > 0) {
    throw new Error('Listing has active transactions');
  }

  if (listing.status !== 'active') {
    throw new Error('Only active listings can be edited');
  }

  if (!data.price || data.price <= 0) {
    throw new Error('Invalid price');
  }

  if (data.quantity_available < 0) {
    throw new Error('Invalid quantity');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `
      INSERT INTO listing_price_history
      (id, listing_id, old_price, new_price, changed_by)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        id,
        listing.price,
        data.price,
        userId
      ]
    );

    await listingRepository.updateListing(id, data, connection);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function changeStatus(id, userId, newStatus) {
  const listing = await listingRepository.getById(id);

  if (!listing) {
    throw new Error('Listing not found');
  }

  if (listing.user_id !== userId) {
    throw new Error('Not authorized');
  }

  if (listing.status === 'deleted') {
    throw new Error('Cannot modify deleted listing');
  }

  await listingRepository.updateStatus(id, newStatus);
}

module.exports = {
  createListing,
  getListing,
  updateListing,
  deleteListing,
  searchListings,
  changeStatus
};
