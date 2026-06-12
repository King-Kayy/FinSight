export async function migrate(db: {
  query: (sql: string, params?: any[]) => Promise<any>;
}): Promise<void> {
  try {
    // 1. users (no FK dependencies)
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        email       VARCHAR(255) UNIQUE NOT NULL,
        name        VARCHAR(255) NOT NULL,
        password    VARCHAR(255) NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 2. income (depends on users)
    await db.query(`
      CREATE TABLE IF NOT EXISTS income (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        category    VARCHAR(100) NOT NULL,
        description TEXT,
        date        DATE NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 3. expenses (depends on users)
    await db.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        category    VARCHAR(100) NOT NULL,
        description TEXT,
        date        DATE NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 4. budgets (depends on users)
    await db.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
        month       SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
        year        SMALLINT NOT NULL CHECK (year >= 2000),
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_id, month, year)
      )
    `);

    // 5. savings_goals (depends on users)
    await db.query(`
      CREATE TABLE IF NOT EXISTS savings_goals (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name            VARCHAR(255) NOT NULL,
        target_amount   NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
        target_date     DATE NOT NULL,
        status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved')),
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 6. recurring_expenses (depends on users)
    await db.query(`
      CREATE TABLE IF NOT EXISTS recurring_expenses (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        category        VARCHAR(100) NOT NULL,
        description     TEXT NOT NULL,
        interval        VARCHAR(20) NOT NULL CHECK (interval IN ('daily', 'weekly', 'monthly')),
        next_run_at     TIMESTAMPTZ NOT NULL,
        status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_income_user_date ON income (user_id, date DESC)`
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses (user_id, date DESC)`
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON budgets (user_id, year, month)`
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_savings_user ON savings_goals (user_id)`
    );
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_expenses (status, next_run_at) WHERE status = 'active'`
    );

    console.log("[migrate] Database schema applied successfully.");
  } catch (err) {
    console.error("[migrate] Failed to apply database schema:", err);
    throw err;
  }
}
