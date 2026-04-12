const { randomUUID: uuidv4 } = require('crypto');

exports.seed = async function (knex) {
  // Limpa na ordem inversa de FK
  await knex('admin_actions').del();
  await knex('notifications').del();
  await knex('fraud_queue').del();
  await knex('fraud_logs').del();
  await knex('listing_stats').del();
  await knex('listing_price_history').del();
  await knex('listing_images').del();
  await knex('wallet_history').del();
  await knex('wallets').del();
  await knex('payments').del();
  await knex('disputes').del();
  await knex('transactions').del();
  await knex('messages').del();
  await knex('conversations').del();
  await knex('listings').del();
  await knex('users').del();

  const adminId = uuidv4();
  const userId = uuidv4();

  await knex('users').insert([
    {
      id: adminId,
      email: 'admin@agrinet.local',
      role: 'admin',
      trust_level: 'verified',
    },
    {
      id: userId,
      email: 'user@agrinet.local',
      role: 'user',
      trust_level: 'new',
    },
  ]);

  await knex('wallets').insert([
    { user_id: adminId, balance: 0 },
    { user_id: userId, balance: 0 },
  ]);
};
