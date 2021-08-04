PRAGMA foreign_keys = ON;

CREATE TABLE lnurl_withdraw (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  msatoshi INTEGER,
  description TEXT,
  expiration INTEGER,
  secret_token TEXT UNIQUE,
  webhook_url TEXT,
  calledback INTEGER DEFAULT false,
  calledback_ts INTEGER,
  lnurl TEXT,
  bolt11 TEXT,
  withdrawn_details TEXT,
  withdrawn_ts INTEGER,
  active INTEGER DEFAULT TRUE,
  created_ts INTEGER DEFAULT CURRENT_TIMESTAMP,
  updated_ts INTEGER DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_lnurl_withdraw_description ON lnurl_withdraw (description);
CREATE INDEX idx_lnurl_withdraw_lnurl ON lnurl_withdraw (lnurl);
CREATE INDEX idx_lnurl_withdraw_bolt11 ON lnurl_withdraw (bolt11);
