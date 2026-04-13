/**
 * Migration inicial — converte schema.sql em knex migrations.
 * Ordem das tabelas respeita dependências de FK.
 */

exports.up = async function (knex) {
  // Se o schema já foi criado pelo schema.sql, pula a migration inteira
  const hasUsers = await knex.schema.hasTable('users');
  if (hasUsers) return;

  // 1. users (sem dependências)
  await knex.schema.createTableIfNotExists('users', (t) => {
    t.string('id', 36).primary();
    t.string('email', 255).notNullable().unique('unique_email');
    t.integer('reputation_score').defaultTo(0);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    t.timestamp('can_withdraw_at').nullable();
    t.integer('fraud_score').defaultTo(0);
    t.string('role', 20).defaultTo('user');
    t.boolean('is_blocked').defaultTo(false);
    t.datetime('blocked_until').nullable();
    t.enu('block_type', ['soft', 'hard']).nullable();
    t.enu('block_level', ['none', 'soft', 'hard']).defaultTo('none');
    t.string('trust_level', 20).defaultTo('new');
  });

  // 2. listings (refs: users)
  await knex.schema.createTableIfNotExists('listings', (t) => {
    t.string('id', 36).primary();
    t.string('user_id', 36).notNullable().references('id').inTable('users');
    t.string('title', 255).notNullable();
    t.enu('category', ['graos', 'frutas', 'gado', 'maquinas', 'outros']).notNullable();
    t.text('description').notNullable();
    t.decimal('price', 12, 2).notNullable();
    t.enu('unit', ['kg', 'saca', 'tonelada', 'cabeca', 'unidade']).notNullable();
    t.decimal('quantity_available', 12, 2).notNullable().defaultTo(0);
    t.string('city', 100).notNullable();
    t.string('state', 2).notNullable();
    t.enu('status', ['active', 'paused', 'sold', 'deleted']).notNullable().defaultTo('active');
    t.string('location', 255).nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.decimal('latitude', 10, 7).nullable();
    t.decimal('longitude', 10, 7).nullable();
    t.string('moderation_status', 20).defaultTo('approved');
    t.string('origin_node', 255).nullable();
    t.index(['category', 'price'], 'idx_listings_category_price');
    t.index(['city', 'state'], 'idx_listings_city_state');
    t.index('status', 'idx_listings_status');
    t.index(['latitude', 'longitude'], 'idx_listings_geo');
  });

  // 3. broadcasts (sem dependências)
  await knex.schema.createTableIfNotExists('broadcasts', (t) => {
    t.string('id', 36).primary();
    t.text('message').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.string('type', 50).nullable();
    t.text('payload').nullable();
  });

  // 4. conversations (refs: listings, users)
  await knex.schema.createTableIfNotExists('conversations', (t) => {
    t.string('id', 36).primary();
    t.string('listing_id', 36).notNullable().references('id').inTable('listings');
    t.string('buyer_id', 36).notNullable().references('id').inTable('users');
    t.string('seller_id', 36).notNullable().references('id').inTable('users');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.string('name', 255).nullable();
    t.boolean('pinned').defaultTo(false);
  });

  // 5. messages (refs: conversations, users)
  await knex.schema.createTableIfNotExists('messages', (t) => {
    t.string('id', 36).primary();
    t.string('conversation_id', 36).notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    t.string('sender_id', 36).notNullable().references('id').inTable('users');
    t.text('message').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.enu('delivery_status', ['sent', 'delivered', 'read']).defaultTo('sent');
    t.text('attachment_url').nullable();
    t.string('attachment_type', 20).nullable();
    t.index(['conversation_id', 'created_at'], 'idx_messages_conversation_time');
  });

  // 6. transactions (refs: users, listings)
  await knex.schema.createTableIfNotExists('transactions', (t) => {
    t.string('id', 36).primary();
    t.string('buyer_id', 36).notNullable().references('id').inTable('users').withKeyName('fk_transaction_buyer').onDelete('CASCADE');
    t.string('seller_id', 36).notNullable().references('id').inTable('users').withKeyName('fk_transaction_seller').onDelete('CASCADE');
    t.string('listing_id', 36).notNullable().references('id').inTable('listings').withKeyName('fk_transaction_listing');
    t.string('listing_title', 255).nullable();
    t.decimal('quantity', 12, 2).notNullable();
    t.decimal('unit_price', 12, 2).notNullable();
    t.decimal('amount', 12, 2).notNullable();
    t.string('status', 50).notNullable().defaultTo('pending');
    t.boolean('buyer_rated').defaultTo(false);
    t.boolean('seller_rated').defaultTo(false);
    t.boolean('rating_given').defaultTo(false);
    t.boolean('escrow_locked').defaultTo(true);
    t.timestamp('escrow_released_at').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('last_ping').nullable();
    t.integer('ping_count').notNullable().defaultTo(0);
    t.text('dialog_notes').nullable();
    t.boolean('dialog_confirmed').notNullable().defaultTo(false);
    t.boolean('flagged_for_review').notNullable().defaultTo(false);
    t.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    t.integer('fraud_score').notNullable().defaultTo(0);
    t.index('buyer_id', 'idx_transactions_buyer');
    t.index('seller_id', 'idx_transactions_seller');
    t.index('status', 'idx_transactions_status');
    t.index(['seller_id', 'status'], 'idx_transactions_seller_status');
    t.index(['buyer_id', 'status'], 'idx_transactions_buyer_status');
    t.index('last_ping', 'idx_transactions_last_ping');
  });

  // 7. disputes (refs: transactions, users)
  await knex.schema.createTableIfNotExists('disputes', (t) => {
    t.string('id', 36).primary();
    t.string('transaction_id', 36).notNullable().unique('uq_dispute_transaction').references('id').inTable('transactions').withKeyName('fk_disputes_transaction');
    t.string('opened_by', 36).notNullable().references('id').inTable('users').withKeyName('fk_disputes_user');
    t.string('reason', 255).notNullable();
    t.string('status', 50).notNullable().defaultTo('open');
    t.string('resolution', 50).nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    t.index('status', 'idx_disputes_status');
    t.index('opened_by', 'idx_disputes_opened_by');
  });

  // 8. payments (refs: users)
  await knex.schema.createTableIfNotExists('payments', (t) => {
    t.string('id', 36).primary();
    t.string('user_id', 36).notNullable().references('id').inTable('users');
    t.decimal('amount', 10, 2).notNullable();
    t.string('provider', 50).notNullable();
    t.enu('status', ['pending', 'succeeded', 'failed', 'refunded', 'partially_refunded']).notNullable();
    t.string('external_id', 100).nullable();
    t.string('idempotency_key', 100).nullable();
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    t.decimal('refunded_amount', 12, 2).notNullable().defaultTo(0);
    t.datetime('expires_at').nullable();
    t.index(['user_id', 'status', 'created_at'], 'idx_payments_user_status_created');
  });

  // 9. wallets (refs: users)
  await knex.schema.createTableIfNotExists('wallets', (t) => {
    t.string('user_id', 36).primary().references('id').inTable('users').withKeyName('fk_wallet_user').onDelete('CASCADE');
    t.decimal('balance', 12, 2).notNullable().defaultTo(0);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });

  // 10. wallet_history (refs: transactions, users)
  await knex.schema.createTableIfNotExists('wallet_history', (t) => {
    t.bigIncrements('id');
    t.string('user_id', 36).notNullable().references('id').inTable('users').withKeyName('fk_wallet_history_user').onDelete('CASCADE');
    t.enu('type', ['purchase', 'sale', 'deposit', 'refund']).notNullable();
    t.decimal('amount', 12, 2).notNullable();
    t.string('note', 255).notNullable().defaultTo('');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.string('tx_id', 36).nullable().references('id').inTable('transactions').withKeyName('fk_wallet_history_tx').onDelete('SET NULL');
    t.string('payment_id', 64).nullable();
    t.unique(['tx_id', 'type'], 'uq_wallet_dedup_tx');
    t.unique(['payment_id', 'type'], 'uq_wallet_dedup_payment');
    t.index('user_id', 'idx_wh_user');
    t.index('created_at', 'idx_wh_created');
    t.index(['user_id', 'type', 'created_at'], 'idx_wh_user_type_created');
  });

  // Trigger wallet_history_validate
  await knex.raw(`
    CREATE TRIGGER wallet_history_validate
    BEFORE INSERT ON wallet_history
    FOR EACH ROW
    BEGIN
      IF NEW.type IN ('purchase','sale') AND NEW.tx_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'tx_id required for purchase or sale';
      END IF;
      IF NEW.type = 'deposit' AND NEW.payment_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'payment_id required for deposit';
      END IF;
      IF NEW.type = 'refund' AND NEW.payment_id IS NULL AND NEW.tx_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'refund requires tx_id or payment_id';
      END IF;
    END
  `);

  // 11. admin_actions (refs: users)
  await knex.schema.createTableIfNotExists('admin_actions', (t) => {
    t.string('id', 36).primary();
    t.string('admin_id', 36).notNullable().references('id').inTable('users');
    t.string('action', 50).notNullable();
    t.string('target_type', 50).notNullable();
    t.string('target_id', 36).notNullable();
    t.text('meta').nullable();
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.index('admin_id');
  });

  // 12. fraud_logs (sem FK formal, mas referencia users)
  await knex.schema.createTableIfNotExists('fraud_logs', (t) => {
    t.bigIncrements('id');
    t.string('user_id', 36).notNullable();
    t.string('reason', 64).notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index('user_id', 'idx_fraud_user');
  });

  // 13. fraud_queue (refs: users)
  await knex.schema.createTableIfNotExists('fraud_queue', (t) => {
    t.string('id', 36).primary();
    t.string('user_id', 36).notNullable().references('id').inTable('users');
    t.string('reason', 255).nullable();
    t.enu('status', ['pending', 'approved', 'blocked', 'flagged']).defaultTo('pending');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('reviewed_at').nullable();
  });

  // 14. listing_images (refs: listings)
  await knex.schema.createTableIfNotExists('listing_images', (t) => {
    t.string('id', 36).primary();
    t.string('listing_id', 36).notNullable().references('id').inTable('listings').withKeyName('fk_listing_images_listing').onDelete('CASCADE');
    t.string('image_url', 500).notNullable();
    t.integer('position').notNullable().defaultTo(0);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index('listing_id', 'idx_listing_images_listing');
  });

  // 15. listing_price_history (refs: listings)
  await knex.schema.createTableIfNotExists('listing_price_history', (t) => {
    t.string('id', 36).primary();
    t.string('listing_id', 36).notNullable().references('id').inTable('listings');
    t.decimal('old_price', 10, 2).notNullable();
    t.decimal('new_price', 10, 2).notNullable();
    t.string('changed_by', 36).notNullable();
    t.timestamp('changed_at').defaultTo(knex.fn.now());
    t.index('listing_id');
  });

  // 16. listing_stats (refs: listings)
  await knex.schema.createTableIfNotExists('listing_stats', (t) => {
    t.string('listing_id', 36).primary().references('id').inTable('listings').onDelete('CASCADE');
    t.integer('views').defaultTo(0);
    t.integer('clicks').defaultTo(0);
    t.integer('messages_started').defaultTo(0);
    t.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });

  // 17. node_registry (sem dependências)
  await knex.schema.createTableIfNotExists('node_registry', (t) => {
    t.bigIncrements('id');
    t.string('node_url', 255).notNullable().unique();
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamp('last_sync_at').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    t.index('active', 'idx_node_active');
    t.index('last_sync_at', 'idx_node_last_sync');
  });

  // 18. notifications (refs: users)
  await knex.schema.createTableIfNotExists('notifications', (t) => {
    t.string('id', 36).primary();
    t.string('user_id', 36).notNullable().references('id').inTable('users');
    t.string('type', 50).notNullable();
    t.string('entity_id', 36).nullable();
    t.text('message').nullable();
    t.boolean('is_read').defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['user_id', 'created_at'], 'idx_notifications_user_time');
  });

  // 19. financial_audit_log (sem FKs)
  await knex.schema.createTableIfNotExists('financial_audit_log', (t) => {
    t.string('id', 36).primary();
    t.string('event_type', 50).notNullable();
    t.string('user_id', 36).nullable();
    t.string('transaction_id', 36).nullable();
    t.string('payment_id', 255).nullable();
    t.string('wallet_user_id', 36).nullable();
    t.decimal('amount', 18, 2).nullable();
    t.string('currency', 10).defaultTo('BRL');
    t.text('metadata').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index('event_type', 'idx_event_type');
    t.index('user_id', 'idx_user');
    t.index('transaction_id', 'idx_transaction');
    t.index('payment_id', 'idx_payment');
    t.index('wallet_user_id', 'idx_wallet_user');
  });
};

exports.down = async function (knex) {
  await knex.raw('DROP TRIGGER IF EXISTS wallet_history_validate');
  const tables = [
    'financial_audit_log',
    'notifications',
    'node_registry',
    'listing_stats',
    'listing_price_history',
    'listing_images',
    'fraud_queue',
    'fraud_logs',
    'admin_actions',
    'wallet_history',
    'wallets',
    'payments',
    'disputes',
    'transactions',
    'messages',
    'conversations',
    'broadcasts',
    'listings',
    'users',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};
