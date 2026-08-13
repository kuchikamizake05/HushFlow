ALTER TABLE indexer_health
  ADD COLUMN data_mode TEXT CHECK (data_mode IN ('fixture', 'live')),
  ADD COLUMN source_identity TEXT CHECK (
    source_identity IS NULL OR
    (length(source_identity) BETWEEN 1 AND 128 AND source_identity ~ '^[A-Za-z0-9._:/-]+$')
  );

ALTER TABLE rfqs
  ADD CONSTRAINT rfqs_seller_ciphertext_size_check
  CHECK ((length(seller_ciphertext) - 2) / 2 <= 4096);

ALTER TABLE rfq_providers
  ADD CONSTRAINT rfq_providers_quote_ciphertext_size_check
  CHECK ((length(quote_ciphertext) - 2) / 2 <= 4096);
