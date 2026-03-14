/*M!999999\- enable the sandbox mode */ 
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_actions` (
  `id` varchar(36) NOT NULL,
  `admin_id` varchar(36) NOT NULL,
  `action` varchar(50) NOT NULL,
  `target_type` varchar(50) NOT NULL,
  `target_id` varchar(36) NOT NULL,
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `admin_actions_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `broadcasts` (
  `id` varchar(36) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `type` varchar(50) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversations` (
  `id` varchar(36) NOT NULL,
  `listing_id` varchar(36) NOT NULL,
  `buyer_id` varchar(36) NOT NULL,
  `seller_id` varchar(36) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `name` varchar(255) DEFAULT NULL,
  `pinned` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `listing_id` (`listing_id`),
  KEY `buyer_id` (`buyer_id`),
  KEY `seller_id` (`seller_id`),
  CONSTRAINT `conversations_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`),
  CONSTRAINT `conversations_ibfk_2` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `conversations_ibfk_3` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `disputes` (
  `id` varchar(36) NOT NULL,
  `transaction_id` varchar(36) NOT NULL,
  `opened_by` varchar(36) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'open',
  `resolution` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dispute_transaction` (`transaction_id`),
  KEY `idx_disputes_status` (`status`),
  KEY `idx_disputes_opened_by` (`opened_by`),
  CONSTRAINT `fk_disputes_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`),
  CONSTRAINT `fk_disputes_user` FOREIGN KEY (`opened_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `financial_audit_log` (
  `id` char(36) NOT NULL,
  `event_type` varchar(50) NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `transaction_id` char(36) DEFAULT NULL,
  `payment_id` varchar(255) DEFAULT NULL,
  `wallet_user_id` char(36) DEFAULT NULL,
  `amount` decimal(18,2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'BRL',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_user` (`user_id`),
  KEY `idx_transaction` (`transaction_id`),
  KEY `idx_payment` (`payment_id`),
  KEY `idx_wallet_user` (`wallet_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `fraud_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(36) NOT NULL,
  `reason` varchar(64) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_fraud_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `fraud_queue` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `status` enum('pending','approved','blocked','flagged') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `reviewed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `fraud_queue_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `listing_images` (
  `id` varchar(36) NOT NULL,
  `listing_id` varchar(36) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `position` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_listing_images_listing` (`listing_id`),
  CONSTRAINT `fk_listing_images_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `listing_price_history` (
  `id` char(36) NOT NULL,
  `listing_id` char(36) NOT NULL,
  `old_price` decimal(10,2) NOT NULL,
  `new_price` decimal(10,2) NOT NULL,
  `changed_by` char(36) NOT NULL,
  `changed_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `listing_id` (`listing_id`),
  CONSTRAINT `listing_price_history_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `listing_stats` (
  `listing_id` char(36) NOT NULL,
  `views` int(11) DEFAULT 0,
  `clicks` int(11) DEFAULT 0,
  `messages_started` int(11) DEFAULT 0,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`listing_id`),
  CONSTRAINT `listing_stats_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `listings` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `category` enum('graos','frutas','gado','maquinas','outros') NOT NULL,
  `description` text NOT NULL,
  `price` decimal(12,2) NOT NULL,
  `unit` enum('kg','saca','tonelada','cabeca','unidade') NOT NULL,
  `quantity_available` decimal(12,2) NOT NULL DEFAULT 0.00,
  `city` varchar(100) NOT NULL,
  `state` char(2) NOT NULL,
  `status` enum('active','paused','sold','deleted') NOT NULL DEFAULT 'active',
  `location` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `moderation_status` varchar(20) DEFAULT 'approved',
  `origin_node` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_listings_category_price` (`category`,`price`),
  KEY `idx_listings_city_state` (`city`,`state`),
  KEY `idx_listings_status` (`status`),
  KEY `idx_listings_geo` (`latitude`,`longitude`),
  CONSTRAINT `listings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` varchar(36) NOT NULL,
  `conversation_id` varchar(36) NOT NULL,
  `sender_id` varchar(36) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `delivery_status` enum('sent','delivered','read') DEFAULT 'sent',
  `attachment_url` text DEFAULT NULL,
  `attachment_type` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sender_id` (`sender_id`),
  KEY `idx_messages_conversation` (`conversation_id`,`created_at`),
  KEY `idx_messages_conversation_time` (`conversation_id`,`created_at`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `node_registry` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `node_url` varchar(255) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `last_sync_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `node_url` (`node_url`),
  KEY `idx_node_active` (`active`),
  KEY `idx_node_last_sync` (`last_sync_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `type` varchar(50) NOT NULL,
  `entity_id` varchar(36) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_time` (`user_id`,`created_at`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `provider` varchar(50) NOT NULL,
  `status` enum('pending','succeeded','failed','refunded','partially_refunded') NOT NULL,
  `external_id` varchar(100) DEFAULT NULL,
  `idempotency_key` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `refunded_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_payments_user_status_created` (`user_id`,`status`,`created_at`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` varchar(36) NOT NULL,
  `buyer_id` varchar(36) NOT NULL,
  `seller_id` varchar(36) NOT NULL,
  `listing_id` varchar(36) NOT NULL,
  `listing_title` varchar(255) DEFAULT NULL,
  `quantity` decimal(12,2) NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `buyer_rated` tinyint(1) DEFAULT 0,
  `seller_rated` tinyint(1) DEFAULT 0,
  `rating_given` tinyint(1) DEFAULT 0,
  `escrow_locked` tinyint(1) DEFAULT 1,
  `escrow_released_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `last_ping` timestamp NULL DEFAULT NULL,
  `ping_count` int(11) NOT NULL DEFAULT 0,
  `dialog_notes` text DEFAULT NULL,
  `dialog_confirmed` tinyint(1) NOT NULL DEFAULT 0,
  `flagged_for_review` tinyint(1) NOT NULL DEFAULT 0,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fraud_score` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_transactions_buyer` (`buyer_id`),
  KEY `idx_transactions_seller` (`seller_id`),
  KEY `idx_transactions_status` (`status`),
  KEY `idx_transactions_seller_status` (`seller_id`,`status`),
  KEY `idx_transactions_buyer_status` (`buyer_id`,`status`),
  KEY `idx_transactions_last_ping` (`last_ping`),
  KEY `fk_transaction_listing` (`listing_id`),
  CONSTRAINT `fk_transaction_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transaction_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`),
  CONSTRAINT `fk_transaction_seller` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `reputation_score` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `can_withdraw_at` timestamp NULL DEFAULT NULL,
  `fraud_score` int(11) DEFAULT 0,
  `role` varchar(20) DEFAULT 'user',
  `is_blocked` tinyint(1) DEFAULT 0,
  `blocked_until` datetime DEFAULT NULL,
  `block_type` enum('soft','hard') DEFAULT NULL,
  `block_level` enum('none','soft','hard') DEFAULT 'none',
  `trust_level` varchar(20) DEFAULT 'new',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `wallet_history` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(36) NOT NULL,
  `type` enum('purchase','sale','deposit','refund') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `note` varchar(255) NOT NULL DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `tx_id` varchar(36) DEFAULT NULL,
  `payment_id` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wallet_dedup_tx` (`tx_id`,`type`),
  UNIQUE KEY `uq_wallet_dedup_payment` (`payment_id`,`type`),
  KEY `idx_wh_user` (`user_id`),
  KEY `idx_wh_created` (`created_at`),
  KEY `idx_wh_user_type_created` (`user_id`,`type`,`created_at`),
  CONSTRAINT `fk_wallet_history_tx` FOREIGN KEY (`tx_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_wallet_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_wallet_amount_nonzero` CHECK (`amount` <> 0)
) ENGINE=InnoDB AUTO_INCREMENT=250 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER wallet_history_validate
BEFORE INSERT ON wallet_history
FOR EACH ROW
BEGIN

  IF NEW.type IN ('purchase','sale') AND NEW.tx_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'tx_id required for purchase or sale';
  END IF;

  IF NEW.type = 'deposit' AND NEW.payment_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'payment_id required for deposit';
  END IF;

  IF NEW.type = 'refund' AND NEW.payment_id IS NULL AND NEW.tx_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'refund requires tx_id or payment_id';
  END IF;

END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `wallets` (
  `user_id` varchar(36) NOT NULL,
  `balance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_wallet_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
