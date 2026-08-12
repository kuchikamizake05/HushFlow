CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  checksum TEXT NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chain_cursor (
  chain_id INTEGER PRIMARY KEY CHECK (chain_id > 0),
  deployment_block NUMERIC(78, 0) NOT NULL CHECK (deployment_block >= 0),
  finality_window INTEGER NOT NULL CHECK (finality_window BETWEEN 8 AND 4096),
  last_processed_block NUMERIC(78, 0) CHECK (last_processed_block >= deployment_block),
  last_processed_hash TEXT CHECK (
    last_processed_hash IS NULL OR
    (last_processed_hash = lower(last_processed_hash) AND last_processed_hash ~ '^0x[0-9a-f]{64}$')
  ),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((last_processed_block IS NULL) = (last_processed_hash IS NULL))
);

CREATE TABLE chain_blocks (
  chain_id INTEGER NOT NULL CHECK (chain_id > 0),
  block_number NUMERIC(78, 0) NOT NULL CHECK (block_number >= 0),
  block_hash TEXT NOT NULL CHECK (
    block_hash = lower(block_hash) AND block_hash ~ '^0x[0-9a-f]{64}$'
  ),
  parent_hash TEXT NOT NULL CHECK (
    parent_hash = lower(parent_hash) AND parent_hash ~ '^0x[0-9a-f]{64}$'
  ),
  block_timestamp TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (chain_id, block_number),
  UNIQUE (chain_id, block_hash)
);

CREATE TABLE chain_logs (
  chain_id INTEGER NOT NULL CHECK (chain_id > 0),
  transaction_hash TEXT NOT NULL CHECK (
    transaction_hash = lower(transaction_hash) AND transaction_hash ~ '^0x[0-9a-f]{64}$'
  ),
  log_index INTEGER NOT NULL CHECK (log_index >= 0),
  block_number NUMERIC(78, 0) NOT NULL CHECK (block_number >= 0),
  contract_address TEXT NOT NULL CHECK (
    contract_address = lower(contract_address) AND contract_address ~ '^0x[0-9a-f]{40}$'
  ),
  schema_version INTEGER NOT NULL CHECK (schema_version = 1),
  topics JSONB NOT NULL CHECK (jsonb_typeof(topics) = 'array'),
  data TEXT NOT NULL CHECK (data = lower(data) AND data ~ '^0x([0-9a-f]{2})*$'),
  event_name TEXT NOT NULL,
  event_args JSONB NOT NULL CHECK (jsonb_typeof(event_args) = 'object'),
  PRIMARY KEY (chain_id, transaction_hash, log_index),
  FOREIGN KEY (chain_id, block_number)
    REFERENCES chain_blocks (chain_id, block_number) ON DELETE CASCADE
);

CREATE INDEX chain_logs_order_idx
  ON chain_logs (chain_id, block_number, log_index);

CREATE TABLE transactions (
  chain_id INTEGER NOT NULL CHECK (chain_id > 0),
  transaction_hash TEXT NOT NULL CHECK (
    transaction_hash = lower(transaction_hash) AND transaction_hash ~ '^0x[0-9a-f]{64}$'
  ),
  block_number NUMERIC(78, 0) NOT NULL CHECK (block_number >= 0),
  block_timestamp TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (chain_id, transaction_hash),
  FOREIGN KEY (chain_id, block_number)
    REFERENCES chain_blocks (chain_id, block_number) ON DELETE CASCADE
);

CREATE TABLE rfqs (
  chain_id INTEGER NOT NULL CHECK (chain_id > 0),
  rfq_id NUMERIC(78, 0) NOT NULL CHECK (rfq_id > 0),
  seller TEXT NOT NULL CHECK (
    seller = lower(seller) AND seller ~ '^0x[0-9a-f]{40}$'
  ),
  lot_amount NUMERIC(78, 0) NOT NULL CHECK (lot_amount > 0),
  quote_cap NUMERIC(78, 0) NOT NULL CHECK (quote_cap > 0),
  quote_deadline NUMERIC(78, 0) NOT NULL CHECK (quote_deadline > 0),
  resolution_deadline NUMERIC(78, 0) NOT NULL CHECK (resolution_deadline > quote_deadline),
  seller_ciphertext TEXT NOT NULL CHECK (
    seller_ciphertext = lower(seller_ciphertext) AND seller_ciphertext ~ '^0x([0-9a-f]{2})+$'
  ),
  status TEXT NOT NULL CHECK (
    status IN ('OPEN', 'SETTLED', 'NO_VALID_QUOTE', 'INVALID_RFQ', 'CANCELLED', 'TIMED_OUT')
  ),
  provider_count INTEGER NOT NULL DEFAULT 0 CHECK (provider_count >= 0),
  action_id TEXT CHECK (
    action_id IS NULL OR (action_id = lower(action_id) AND action_id ~ '^0x[0-9a-f]{64}$')
  ),
  source_transaction_hash TEXT NOT NULL,
  source_log_index INTEGER NOT NULL,
  PRIMARY KEY (chain_id, rfq_id),
  FOREIGN KEY (chain_id, source_transaction_hash, source_log_index)
    REFERENCES chain_logs (chain_id, transaction_hash, log_index) ON DELETE CASCADE
);

CREATE INDEX rfqs_status_id_idx ON rfqs (chain_id, status, rfq_id DESC);
CREATE INDEX rfqs_seller_id_idx ON rfqs (chain_id, seller, rfq_id DESC);

CREATE TABLE rfq_providers (
  chain_id INTEGER NOT NULL CHECK (chain_id > 0),
  rfq_id NUMERIC(78, 0) NOT NULL CHECK (rfq_id > 0),
  provider TEXT NOT NULL CHECK (
    provider = lower(provider) AND provider ~ '^0x[0-9a-f]{40}$'
  ),
  position INTEGER NOT NULL CHECK (position >= 0),
  quote_ciphertext TEXT NOT NULL CHECK (
    quote_ciphertext = lower(quote_ciphertext) AND quote_ciphertext ~ '^0x([0-9a-f]{2})+$'
  ),
  submitted_at_block NUMERIC(78, 0) NOT NULL CHECK (submitted_at_block >= 0),
  source_transaction_hash TEXT NOT NULL,
  source_log_index INTEGER NOT NULL,
  PRIMARY KEY (chain_id, rfq_id, provider),
  UNIQUE (chain_id, rfq_id, position),
  FOREIGN KEY (chain_id, rfq_id) REFERENCES rfqs (chain_id, rfq_id) ON DELETE CASCADE,
  FOREIGN KEY (chain_id, source_transaction_hash, source_log_index)
    REFERENCES chain_logs (chain_id, transaction_hash, log_index) ON DELETE CASCADE
);

CREATE INDEX rfq_providers_provider_idx
  ON rfq_providers (chain_id, provider, rfq_id DESC);

CREATE TABLE fcc_actions (
  chain_id INTEGER NOT NULL CHECK (chain_id > 0),
  action_id TEXT NOT NULL CHECK (
    action_id = lower(action_id) AND action_id ~ '^0x[0-9a-f]{64}$'
  ),
  rfq_id NUMERIC(78, 0) NOT NULL CHECK (rfq_id > 0),
  status TEXT NOT NULL CHECK (status IN ('REQUESTED', 'RESOLVED', 'EXPIRED')),
  requested_at_block NUMERIC(78, 0) NOT NULL CHECK (requested_at_block >= 0),
  source_transaction_hash TEXT NOT NULL,
  source_log_index INTEGER NOT NULL,
  PRIMARY KEY (chain_id, action_id),
  UNIQUE (chain_id, rfq_id),
  FOREIGN KEY (chain_id, rfq_id) REFERENCES rfqs (chain_id, rfq_id) ON DELETE CASCADE,
  FOREIGN KEY (chain_id, source_transaction_hash, source_log_index)
    REFERENCES chain_logs (chain_id, transaction_hash, log_index) ON DELETE CASCADE
);

CREATE TABLE rfq_outcomes (
  chain_id INTEGER NOT NULL CHECK (chain_id > 0),
  rfq_id NUMERIC(78, 0) NOT NULL CHECK (rfq_id > 0),
  result_type TEXT NOT NULL CHECK (result_type IN ('TRADE', 'NO_VALID_QUOTE', 'INVALID_RFQ')),
  winning_provider TEXT CHECK (
    winning_provider IS NULL OR
    (winning_provider = lower(winning_provider) AND winning_provider ~ '^0x[0-9a-f]{40}$')
  ),
  winning_quote NUMERIC(78, 0) CHECK (winning_quote > 0),
  result_nonce TEXT NOT NULL CHECK (
    result_nonce = lower(result_nonce) AND result_nonce ~ '^0x[0-9a-f]{64}$'
  ),
  source_transaction_hash TEXT NOT NULL,
  source_log_index INTEGER NOT NULL,
  PRIMARY KEY (chain_id, rfq_id),
  FOREIGN KEY (chain_id, rfq_id) REFERENCES rfqs (chain_id, rfq_id) ON DELETE CASCADE,
  FOREIGN KEY (chain_id, source_transaction_hash, source_log_index)
    REFERENCES chain_logs (chain_id, transaction_hash, log_index) ON DELETE CASCADE,
  CHECK (
    (result_type = 'TRADE' AND winning_provider IS NOT NULL AND winning_quote IS NOT NULL) OR
    (result_type <> 'TRADE' AND winning_provider IS NULL AND winning_quote IS NULL)
  )
);

CREATE TABLE claims (
  chain_id INTEGER NOT NULL CHECK (chain_id > 0),
  rfq_id NUMERIC(78, 0) NOT NULL CHECK (rfq_id > 0),
  account TEXT NOT NULL CHECK (
    account = lower(account) AND account ~ '^0x[0-9a-f]{40}$'
  ),
  fxrp_amount NUMERIC(78, 0) NOT NULL CHECK (fxrp_amount >= 0),
  usdt0_amount NUMERIC(78, 0) NOT NULL CHECK (usdt0_amount >= 0),
  claimed BOOLEAN NOT NULL,
  source_transaction_hash TEXT NOT NULL,
  source_log_index INTEGER NOT NULL,
  PRIMARY KEY (chain_id, rfq_id, account),
  FOREIGN KEY (chain_id, rfq_id) REFERENCES rfqs (chain_id, rfq_id) ON DELETE CASCADE,
  FOREIGN KEY (chain_id, source_transaction_hash, source_log_index)
    REFERENCES chain_logs (chain_id, transaction_hash, log_index) ON DELETE CASCADE
);

CREATE TABLE indexer_health (
  chain_id INTEGER PRIMARY KEY CHECK (chain_id > 0),
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unavailable')),
  latest_indexed_block NUMERIC(78, 0) NOT NULL CHECK (latest_indexed_block >= 0),
  latest_observed_block NUMERIC(78, 0) NOT NULL CHECK (latest_observed_block >= 0),
  lag_blocks NUMERIC(78, 0) NOT NULL CHECK (lag_blocks >= 0),
  detail_code TEXT CHECK (
    detail_code IS NULL OR detail_code IN (
      'RPC_UNAVAILABLE',
      'INDEXER_LAGGING',
      'DATABASE_UNAVAILABLE',
      'EVENT_INVALID',
      'REORG_REPLAY_REQUIRED'
    )
  ),
  last_success_at TIMESTAMPTZ,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
