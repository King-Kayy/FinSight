Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let serverless_http = require("serverless-http");
serverless_http = __toESM(serverless_http);
let express = require("express");
express = __toESM(express);
let cors = require("cors");
cors = __toESM(cors);
let node_cron = require("node-cron");
node_cron = __toESM(node_cron);
let bcryptjs = require("bcryptjs");
bcryptjs = __toESM(bcryptjs);
let jsonwebtoken = require("jsonwebtoken");
jsonwebtoken = __toESM(jsonwebtoken);
let pg = require("pg");
pg = __toESM(pg);
let fs = require("fs");
let path = require("path");
let multer = require("multer");
multer = __toESM(multer);
//#region server/routes/demo.ts
var handleDemo = (req, res) => {
	res.status(200).json({ message: "Hello from Express server" });
};
//#endregion
//#region server/db/schema.ts
async function migrate$1(db) {
	try {
		await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        email       VARCHAR(255) UNIQUE NOT NULL,
        name        VARCHAR(255) NOT NULL,
        password    VARCHAR(255) NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
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
		await db.query(`CREATE INDEX IF NOT EXISTS idx_income_user_date ON income (user_id, date DESC)`);
		await db.query(`CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses (user_id, date DESC)`);
		await db.query(`CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON budgets (user_id, year, month)`);
		await db.query(`CREATE INDEX IF NOT EXISTS idx_savings_user ON savings_goals (user_id)`);
		await db.query(`CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_expenses (status, next_run_at) WHERE status = 'active'`);
		console.log("[migrate] Database schema applied successfully.");
	} catch (err) {
		console.error("[migrate] Failed to apply database schema:", err);
		throw err;
	}
}
//#endregion
//#region server/db/fallback.ts
/**
* server/db/fallback.ts
*
* In-memory database fallback for development environments that lack a
* running PostgreSQL instance (i.e. no DATABASE_URL env var).
*
* Data is persisted to .data/db.json so it survives server restarts.
*/
var TABLE_NAMES = [
	"users",
	"income",
	"expenses",
	"budgets",
	"savings_goals",
	"recurring_expenses"
];
var DATA_DIR = (0, path.join)(process.cwd(), ".data");
var DB_FILE = (0, path.join)(DATA_DIR, "db.json");
function loadFromDisk() {
	try {
		if ((0, fs.existsSync)(DB_FILE)) {
			const raw = (0, fs.readFileSync)(DB_FILE, "utf-8");
			return JSON.parse(raw);
		}
	} catch {}
	return {
		tables: Object.fromEntries(TABLE_NAMES.map((n) => [n, []])),
		counters: Object.fromEntries(TABLE_NAMES.map((n) => [n, 0]))
	};
}
function saveToDisk() {
	try {
		if (!(0, fs.existsSync)(DATA_DIR)) (0, fs.mkdirSync)(DATA_DIR, { recursive: true });
		(0, fs.writeFileSync)(DB_FILE, JSON.stringify({
			tables: Object.fromEntries(tables),
			counters: Object.fromEntries(counters)
		}, null, 2), "utf-8");
	} catch (err) {
		console.warn("[fallbackDb] Could not persist to disk:", err);
	}
}
var loaded = loadFromDisk();
var tables = new Map(TABLE_NAMES.map((n) => [n, loaded.tables[n] ?? []]));
var counters = new Map(TABLE_NAMES.map((n) => [n, loaded.counters[n] ?? 0]));
function getTable(name) {
	return tables.get(name);
}
function nextId(table) {
	const id = (counters.get(table) ?? 0) + 1;
	counters.set(table, id);
	return id;
}
function now() {
	return (/* @__PURE__ */ new Date()).toISOString();
}
/**
* Resolve a positional parameter placeholder ($1, $2 …) to its value in
* `params`. Index is 1-based in PostgreSQL syntax.
*/
function resolveParam(placeholder, params) {
	return params[parseInt(placeholder.slice(1), 10) - 1];
}
/**
* Parse the column list and VALUES list from an INSERT statement body.
* Handles:  (col1, col2, col3) VALUES ($1, $2, $3)
*/
function parseInsert(sql, params) {
	const colMatch = sql.match(/\(([^)]+)\)\s+VALUES/i);
	if (!colMatch) throw new Error(`[fallbackDb] Cannot parse INSERT columns: ${sql}`);
	const columns = colMatch[1].split(",").map((c) => c.trim());
	const valMatch = sql.match(/VALUES\s*\(([^)]+)\)/i);
	if (!valMatch) throw new Error(`[fallbackDb] Cannot parse INSERT values: ${sql}`);
	return {
		columns,
		values: valMatch[1].split(",").map((v) => v.trim()).map((p) => {
			if (/^\$\d+$/.test(p)) return resolveParam(p, params);
			if (/^NOW\(\)$/i.test(p)) return now();
			const strMatch = p.match(/^'([^']*)'$/);
			if (strMatch) return strMatch[1];
			return p;
		})
	};
}
/**
* Parse SET clause from an UPDATE statement.
* Handles:  col1 = $1, col2 = $2, updated_at = NOW()
*/
function parseSetClause(setClause, params) {
	const updates = {};
	const parts = setClause.split(/,(?![^(]*\))/);
	for (const part of parts) {
		const eqIdx = part.indexOf("=");
		if (eqIdx === -1) continue;
		const col = part.slice(0, eqIdx).trim();
		const rawVal = part.slice(eqIdx + 1).trim();
		if (/^\$\d+$/.test(rawVal)) updates[col] = resolveParam(rawVal, params);
		else if (/^NOW\(\)$/i.test(rawVal)) updates[col] = now();
		else {
			const strMatch = rawVal.match(/^'([^']*)'$/);
			updates[col] = strMatch ? strMatch[1] : rawVal;
		}
	}
	return updates;
}
/**
* Extract the table name from a SQL fragment.
* Works for:  ... FROM <table> ...  /  INSERT INTO <table> ...  /  UPDATE <table> ...  /  DELETE FROM <table> ...
*/
function extractTableName(sql) {
	for (const pat of [
		/\bFROM\s+(\w+)/i,
		/\bINSERT\s+INTO\s+(\w+)/i,
		/\bUPDATE\s+(\w+)/i,
		/\bDELETE\s+FROM\s+(\w+)/i
	]) {
		const m = sql.match(pat);
		if (m) return m[1];
	}
	return null;
}
/**
* Build a simple filter function from a WHERE clause.
* Supported conditions (AND-combined):
*   user_id = $N
*   id = $N
*   email = $N
*   month = $N
*   year = $N
*   status = 'active'
*   next_run_at <= NOW()   (compared by Date)
*/
function buildFilter(whereClause, params) {
	const conditions = whereClause.split(/\bAND\b/i).map((c) => c.trim());
	return (row) => {
		for (const cond of conditions) {
			const paramEq = cond.match(/^(\w+)\s*=\s*(\$\d+)$/i);
			if (paramEq) {
				const col = paramEq[1];
				const val = resolveParam(paramEq[2], params);
				if (row[col] != val) return false;
				continue;
			}
			const strEq = cond.match(/^(\w+)\s*=\s*'([^']*)'$/i);
			if (strEq) {
				const col = strEq[1];
				const val = strEq[2];
				if (row[col] !== val) return false;
				continue;
			}
			const lteNow = cond.match(/^(\w+)\s*<=\s*NOW\(\)$/i);
			if (lteNow) {
				const col = lteNow[1];
				if (!(new Date(row[col]) <= /* @__PURE__ */ new Date())) return false;
				continue;
			}
			const gteNow = cond.match(/^(\w+)\s*>=\s*NOW\(\)$/i);
			if (gteNow) {
				const col = gteNow[1];
				if (!(new Date(row[col]) >= /* @__PURE__ */ new Date())) return false;
				continue;
			}
		}
		return true;
	};
}
function handleBeginCommitRollback() {
	return {
		rows: [],
		rowCount: 0
	};
}
function handleInsert(sql, params, tableName) {
	const { columns, values } = parseInsert(sql, params);
	const row = {};
	for (let i = 0; i < columns.length; i++) row[columns[i]] = values[i];
	if (tableName === "users" && row.email) {
		if (getTable("users").find((r) => r.email === row.email)) {
			const err = /* @__PURE__ */ new Error("duplicate key value violates unique constraint");
			err.code = "23505";
			throw err;
		}
	}
	row.id = nextId(tableName);
	const ts = now();
	if (!("created_at" in row)) row.created_at = ts;
	if (!("updated_at" in row)) row.updated_at = ts;
	getTable(tableName).push(row);
	saveToDisk();
	const returningMatch = sql.match(/RETURNING\s+(.+)$/i);
	if (!returningMatch) return {
		rows: [],
		rowCount: 1
	};
	if (/RETURNING\s+\*/i.test(sql)) return {
		rows: [row],
		rowCount: 1
	};
	const cols = returningMatch[1].split(",").map((c) => c.trim());
	const projected = {};
	for (const col of cols) projected[col] = row[col];
	return {
		rows: [projected],
		rowCount: 1
	};
}
function handleSelect(sql, params, tableName) {
	let rows = [...getTable(tableName)];
	const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|\s+GROUP\s+BY|$)/is);
	if (whereMatch) {
		const filter = buildFilter(whereMatch[1].trim(), params);
		rows = rows.filter(filter);
	}
	if (/ORDER\s+BY\s+date\s+DESC/i.test(sql)) rows.sort((a, b) => {
		const da = new Date(a.date).getTime();
		return new Date(b.date).getTime() - da;
	});
	if (/ORDER\s+BY\s+year\s+DESC,\s*month\s+DESC/i.test(sql)) rows.sort((a, b) => {
		if (b.year !== a.year) return b.year - a.year;
		return b.month - a.month;
	});
	if (/ORDER\s+BY\s+created_at\s+DESC/i.test(sql)) rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
	if (/ORDER\s+BY\s+next_run_at/i.test(sql)) rows.sort((a, b) => {
		return new Date(a.next_run_at).getTime() - new Date(b.next_run_at).getTime();
	});
	return {
		rows,
		rowCount: rows.length
	};
}
function handleUpdate(sql, params, tableName) {
	const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/is);
	if (!setMatch) throw new Error(`[fallbackDb] Cannot parse UPDATE SET clause: ${sql}`);
	const updates = parseSetClause(setMatch[1], params);
	const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+RETURNING|$)/is);
	const filter = whereMatch ? buildFilter(whereMatch[1].trim(), params) : () => true;
	const tableRows = getTable(tableName);
	const updatedRows = [];
	for (let i = 0; i < tableRows.length; i++) if (filter(tableRows[i])) {
		tableRows[i] = {
			...tableRows[i],
			...updates
		};
		if (!("updated_at" in updates)) tableRows[i].updated_at = now();
		updatedRows.push(tableRows[i]);
	}
	saveToDisk();
	const returningMatch = sql.match(/RETURNING\s+(.+)$/i);
	if (!returningMatch) return {
		rows: [],
		rowCount: updatedRows.length
	};
	if (/RETURNING\s+\*/i.test(sql)) return {
		rows: updatedRows,
		rowCount: updatedRows.length
	};
	const cols = returningMatch[1].split(",").map((c) => c.trim());
	return {
		rows: updatedRows.map((r) => {
			const p = {};
			for (const col of cols) p[col] = r[col];
			return p;
		}),
		rowCount: updatedRows.length
	};
}
function handleDelete(sql, params, tableName) {
	const whereMatch = sql.match(/WHERE\s+(.+?)$/is);
	const filter = whereMatch ? buildFilter(whereMatch[1].trim(), params) : () => true;
	const tableRows = getTable(tableName);
	const before = tableRows.length;
	const remaining = tableRows.filter((r) => !filter(r));
	tables.set(tableName, remaining);
	saveToDisk();
	return {
		rows: [],
		rowCount: before - remaining.length
	};
}
/**
* The fallback database object.
* Implements the same `query` interface as `pg.Pool`.
*/
var fallbackDb = { async query(sql, params) {
	const p = params ?? [];
	const trimmed = sql.trim();
	if (/^(BEGIN|COMMIT|ROLLBACK)$/i.test(trimmed)) return handleBeginCommitRollback();
	const tableName = extractTableName(trimmed);
	if (/^\s*INSERT/i.test(trimmed)) {
		if (!tableName) throw new Error(`[fallbackDb] Could not find table name in: ${sql}`);
		return handleInsert(trimmed, p, tableName);
	}
	if (/^\s*SELECT/i.test(trimmed)) {
		if (!tableName) throw new Error(`[fallbackDb] Could not find table name in: ${sql}`);
		return handleSelect(trimmed, p, tableName);
	}
	if (/^\s*UPDATE/i.test(trimmed)) {
		if (!tableName) throw new Error(`[fallbackDb] Could not find table name in: ${sql}`);
		return handleUpdate(trimmed, p, tableName);
	}
	if (/^\s*DELETE/i.test(trimmed)) {
		if (!tableName) throw new Error(`[fallbackDb] Could not find table name in: ${sql}`);
		return handleDelete(trimmed, p, tableName);
	}
	console.warn(`[fallbackDb] Unrecognised SQL statement (returning empty): ${sql}`);
	return {
		rows: [],
		rowCount: 0
	};
} };
/**
* migrate() no-op — schema is implicit in the in-memory store.
* Called by server/db/index.ts on startup; must not throw.
*/
async function migrate() {}
//#endregion
//#region server/db/index.ts
/**
* server/db/index.ts
*
* DB connection factory.
*
* - If DATABASE_URL is set: creates a pg.Pool, runs migrate() to apply schema,
*   and exports the pool as `db`.
* - If DATABASE_URL is absent: imports the in-memory fallback store, calls its
*   no-op migrate(), and exports fallbackDb as `db`.
*
* All services import `db` (or call `getDb()`) to access the database.
* The server startup code should await `initializeDb()` before accepting
* requests so the schema is ready before the first query.
*/
var { Pool } = pg.default;
var db = fallbackDb;
var _initialized = false;
/**
* Initialise the database connection.
*
* - When DATABASE_URL is present: connects to PostgreSQL and runs DDL
*   migrations via schema.ts.
* - When DATABASE_URL is absent: warms up the in-memory fallback and calls
*   the no-op migrate().
*
* Safe to call multiple times — subsequent calls return immediately.
* Must be awaited by the server startup code before handling requests.
*/
async function initializeDb() {
	if (_initialized) return db;
	if (process.env.DATABASE_URL) try {
		const pool = new Pool({
			connectionString: process.env.DATABASE_URL,
			ssl: process.env.DATABASE_URL.includes("supabase") ? { rejectUnauthorized: false } : void 0,
			connectionTimeoutMillis: 5e3
		});
		pool.on("connect", (client) => {
			client.query("SET statement_timeout = '30s'").catch(() => {});
		});
		await migrate$1(pool);
		console.log("[db] Connected to PostgreSQL");
		db = pool;
	} catch (err) {
		console.error("[db] PostgreSQL connection failed, falling back to in-memory store:", err.message);
		await migrate();
		db = fallbackDb;
		console.log("[db] Using in-memory fallback database");
	}
	else {
		await migrate();
		await fallbackDb.query("BEGIN");
		console.log("[db] Using in-memory fallback database");
		db = fallbackDb;
	}
	_initialized = true;
	return db;
}
//#endregion
//#region server/middleware/errors.ts
var ValidationError = class extends Error {
	constructor(message, field) {
		super(message);
		this.field = field;
		this.name = "ValidationError";
	}
};
var AuthError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "AuthError";
	}
};
var ForbiddenError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "ForbiddenError";
	}
};
var NotFoundError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "NotFoundError";
	}
};
var ConflictError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "ConflictError";
	}
};
//#endregion
//#region server/services/authService.ts
var SALT_ROUNDS = 12;
var JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";
/**
* Register a new user and return a signed JWT (same shape as login).
* Throws ValidationError for missing/invalid fields, ConflictError on duplicate email.
*/
async function register(email, name, password) {
	if (!email) throw new ValidationError("Email is required", "email");
	if (!name) throw new ValidationError("Name is required", "name");
	if (!password || password.length < 8) throw new ValidationError("Password must be at least 8 characters", "password");
	const passwordHash = await bcryptjs.default.hash(password, SALT_ROUNDS);
	try {
		const row = (await db.query("INSERT INTO users (email, name, password) VALUES ($1, $2, $3) RETURNING id, email, name", [
			email,
			name,
			passwordHash
		])).rows[0];
		console.log("[auth] Registered user:", row.id, row.email, "| hash prefix:", passwordHash.slice(0, 7));
		return {
			token: jsonwebtoken.default.sign({
				id: row.id,
				email: row.email
			}, JWT_SECRET, { expiresIn: "24h" }),
			user: {
				id: row.id,
				email: row.email,
				name: row.name
			}
		};
	} catch (err) {
		if (err?.code === "23505" || (err?.message)?.includes("unique")) throw new ConflictError("Email already registered");
		if ((err?.message)?.toLowerCase().includes("duplicate")) throw new ConflictError("Email already registered");
		throw err;
	}
}
/**
* Authenticate a user and return a signed JWT.
* Throws AuthError on unknown email or wrong password.
*/
async function login(email, password) {
	const result = await db.query("SELECT id, email, name, password FROM users WHERE email = $1", [email]);
	if (result.rows.length === 0) throw new AuthError("Invalid credentials");
	const user = result.rows[0];
	if (!await bcryptjs.default.compare(password, user.password)) {
		console.error("[auth] bcrypt.compare failed for", email, "| hash length:", user.password?.length, "| hash prefix:", user.password?.slice(0, 7));
		throw new AuthError("Invalid credentials");
	}
	return {
		token: jsonwebtoken.default.sign({
			id: user.id,
			email: user.email
		}, JWT_SECRET, { expiresIn: "24h" }),
		user: {
			id: user.id,
			email: user.email,
			name: user.name
		}
	};
}
//#endregion
//#region server/routes/auth.ts
var router$8 = (0, express.Router)();
router$8.post("/register", async (req, res, next) => {
	try {
		const { email, name, password } = req.body;
		const result = await register(email, name, password);
		res.status(201).json(result);
	} catch (err) {
		next(err);
	}
});
router$8.post("/login", async (req, res, next) => {
	try {
		const { email, password } = req.body;
		const result = await login(email, password);
		res.json(result);
	} catch (err) {
		next(err);
	}
});
//#endregion
//#region server/middleware/auth.ts
var authenticateJWT = (req, res, next) => {
	const authHeader = req.headers["authorization"];
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		res.status(401).json({ error: "Unauthorized" });
		return;
	}
	const token = authHeader.slice(7);
	const secret = process.env.JWT_SECRET ?? "dev-secret";
	try {
		const payload = jsonwebtoken.default.verify(token, secret);
		if (typeof payload.id !== "number" || typeof payload.email !== "string") {
			res.status(401).json({ error: "Unauthorized" });
			return;
		}
		req.user = {
			id: payload.id,
			email: payload.email
		};
		next();
	} catch {
		res.status(401).json({ error: "Unauthorized" });
	}
};
//#endregion
//#region server/services/transactionService.ts
function validateTransaction(data) {
	if (data.amount <= 0) throw new ValidationError("Amount must be greater than 0", "amount");
	if (!data.category || data.category.trim() === "") throw new ValidationError("Category is required", "category");
	if (!data.date || data.date.trim() === "") throw new ValidationError("Date is required", "date");
}
function validateAmountIfProvided(amount) {
	if (amount !== void 0 && amount <= 0) throw new ValidationError("Amount must be greater than 0", "amount");
}
async function listIncome(userId) {
	return (await db.query("SELECT * FROM income WHERE user_id = $1 ORDER BY date DESC", [userId])).rows;
}
async function createIncome(userId, data) {
	validateTransaction(data);
	return (await db.query(`INSERT INTO income (user_id, amount, category, description, date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`, [
		userId,
		data.amount,
		data.category,
		data.description ?? null,
		data.date
	])).rows[0];
}
async function updateIncome(userId, id, data) {
	const existing = await db.query("SELECT * FROM income WHERE id = $1", [id]);
	if (existing.rows.length === 0) throw new NotFoundError("Income record not found");
	if (existing.rows[0].user_id !== userId) throw new ForbiddenError("You do not have permission to update this record");
	validateAmountIfProvided(data.amount);
	validateTransaction(data);
	return (await db.query(`UPDATE income
     SET amount = $1, category = $2, description = $3, date = $4, updated_at = NOW()
     WHERE id = $5
     RETURNING *`, [
		data.amount,
		data.category,
		data.description ?? null,
		data.date,
		id
	])).rows[0];
}
async function deleteIncome(userId, id) {
	const existing = await db.query("SELECT * FROM income WHERE id = $1", [id]);
	if (existing.rows.length === 0) throw new NotFoundError("Income record not found");
	if (existing.rows[0].user_id !== userId) throw new ForbiddenError("You do not have permission to delete this record");
	await db.query("DELETE FROM income WHERE id = $1 AND user_id = $2", [id, userId]);
}
async function listExpenses(userId) {
	return (await db.query("SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC", [userId])).rows;
}
async function createExpense(userId, data) {
	validateTransaction(data);
	return (await db.query(`INSERT INTO expenses (user_id, amount, category, description, date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`, [
		userId,
		data.amount,
		data.category,
		data.description ?? null,
		data.date
	])).rows[0];
}
async function updateExpense(userId, id, data) {
	const existing = await db.query("SELECT * FROM expenses WHERE id = $1", [id]);
	if (existing.rows.length === 0) throw new NotFoundError("Expense record not found");
	if (existing.rows[0].user_id !== userId) throw new ForbiddenError("You do not have permission to update this record");
	validateAmountIfProvided(data.amount);
	validateTransaction(data);
	return (await db.query(`UPDATE expenses
     SET amount = $1, category = $2, description = $3, date = $4, updated_at = NOW()
     WHERE id = $5
     RETURNING *`, [
		data.amount,
		data.category,
		data.description ?? null,
		data.date,
		id
	])).rows[0];
}
async function deleteExpense(userId, id) {
	const existing = await db.query("SELECT * FROM expenses WHERE id = $1", [id]);
	if (existing.rows.length === 0) throw new NotFoundError("Expense record not found");
	if (existing.rows[0].user_id !== userId) throw new ForbiddenError("You do not have permission to delete this record");
	await db.query("DELETE FROM expenses WHERE id = $1 AND user_id = $2", [id, userId]);
}
//#endregion
//#region server/routes/income.ts
var router$7 = (0, express.Router)();
router$7.use(authenticateJWT);
router$7.get("/income", async (req, res, next) => {
	try {
		const records = await listIncome(req.user.id);
		res.json(records);
	} catch (err) {
		next(err);
	}
});
router$7.post("/income", async (req, res, next) => {
	try {
		const record = await createIncome(req.user.id, req.body);
		res.status(201).json(record);
	} catch (err) {
		next(err);
	}
});
router$7.put("/income/:id", async (req, res, next) => {
	try {
		const record = await updateIncome(req.user.id, parseInt(req.params.id), req.body);
		res.json(record);
	} catch (err) {
		next(err);
	}
});
router$7.delete("/income/:id", async (req, res, next) => {
	try {
		await deleteIncome(req.user.id, parseInt(req.params.id));
		res.status(204).send();
	} catch (err) {
		next(err);
	}
});
//#endregion
//#region server/routes/expenses.ts
var router$6 = (0, express.Router)();
router$6.use(authenticateJWT);
router$6.get("/expenses", async (req, res, next) => {
	try {
		const records = await listExpenses(req.user.id);
		res.json(records);
	} catch (err) {
		next(err);
	}
});
router$6.post("/expenses", async (req, res, next) => {
	try {
		const record = await createExpense(req.user.id, req.body);
		res.status(201).json(record);
	} catch (err) {
		next(err);
	}
});
router$6.put("/expenses/:id", async (req, res, next) => {
	try {
		const record = await updateExpense(req.user.id, parseInt(req.params.id), req.body);
		res.json(record);
	} catch (err) {
		next(err);
	}
});
router$6.delete("/expenses/:id", async (req, res, next) => {
	try {
		await deleteExpense(req.user.id, parseInt(req.params.id));
		res.status(204).send();
	} catch (err) {
		next(err);
	}
});
//#endregion
//#region server/services/reportService.ts
/**
* Compute monthly totals from arrays of amounts.
* Returns zeros when both arrays are empty / all-zero.
*/
function computeMonthlySummary(income, expenses) {
	const total_income = income.reduce((sum, v) => sum + v, 0);
	const total_expenses = expenses.reduce((sum, v) => sum + v, 0);
	return {
		total_income,
		total_expenses,
		savings: total_income - total_expenses
	};
}
/**
* Fetch a monthly report for the given user.
*
* - If both `year` and `month` are provided they are used directly.
* - If neither is provided the current calendar month/year is used.
* - If only one of the two is supplied a ValidationError is thrown.
*
* NOTE (fallback DB): The in-memory fallback store does not support
* `EXTRACT(MONTH FROM date)` SQL syntax, so when using the fallback we fetch
* all records for the user and apply the month/year filter in JavaScript.
* In production with PostgreSQL the SQL-level filtering works correctly.
*/
async function getMonthlyReport(userId, year, month) {
	const bothProvided = year !== void 0 && month !== void 0;
	const neitherProvided = year === void 0 && month === void 0;
	if (!bothProvided && !neitherProvided) throw new ValidationError("Both year and month must be provided together");
	let resolvedYear;
	let resolvedMonth;
	if (neitherProvided) {
		const now = /* @__PURE__ */ new Date();
		resolvedYear = now.getFullYear();
		resolvedMonth = now.getMonth() + 1;
	} else {
		resolvedYear = year;
		resolvedMonth = month;
	}
	if (resolvedMonth < 1 || resolvedMonth > 12) throw new ValidationError("Month must be between 1 and 12", "month");
	if (resolvedYear < 2e3) throw new ValidationError("Year must be >= 2000", "year");
	let incomeRows;
	let expenseRows;
	try {
		const incomeResult = await db.query(`SELECT * FROM income
       WHERE user_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR  FROM date) = $3`, [
			userId,
			resolvedMonth,
			resolvedYear
		]);
		const expenseResult = await db.query(`SELECT * FROM expenses
       WHERE user_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR  FROM date) = $3`, [
			userId,
			resolvedMonth,
			resolvedYear
		]);
		incomeRows = incomeResult.rows;
		expenseRows = expenseResult.rows;
	} catch {
		const allIncome = await db.query("SELECT * FROM income WHERE user_id = $1", [userId]);
		const allExpenses = await db.query("SELECT * FROM expenses WHERE user_id = $1", [userId]);
		const matchesMonth = (row) => {
			const d = new Date(row.date);
			return d.getFullYear() === resolvedYear && d.getMonth() + 1 === resolvedMonth;
		};
		incomeRows = allIncome.rows.filter(matchesMonth);
		expenseRows = allExpenses.rows.filter(matchesMonth);
	}
	const { total_income, total_expenses, savings } = computeMonthlySummary(incomeRows.map((r) => parseFloat(r.amount)), expenseRows.map((r) => parseFloat(r.amount)));
	const categoryMap = /* @__PURE__ */ new Map();
	for (const row of expenseRows) {
		const cat = row.category ?? "Uncategorized";
		categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + parseFloat(row.amount));
	}
	const expense_by_category = [];
	for (const [category, total] of categoryMap.entries()) {
		const percentage = total_expenses > 0 ? parseFloat((total / total_expenses * 100).toFixed(2)) : 0;
		expense_by_category.push({
			category,
			total: total.toFixed(2),
			percentage
		});
	}
	expense_by_category.sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
	return {
		year: resolvedYear,
		month: resolvedMonth,
		total_income: total_income.toFixed(2),
		total_expenses: total_expenses.toFixed(2),
		savings: savings.toFixed(2),
		expense_by_category
	};
}
//#endregion
//#region server/routes/reports.ts
var router$5 = (0, express.Router)();
router$5.use(authenticateJWT);
/**
* GET /api/reports/monthly?year=&month=
*
* Returns a monthly income/expense summary for the authenticated user.
* Both `year` and `month` are optional; if omitted the current month is used.
* If only one is supplied the service throws a ValidationError (422).
*/
router$5.get("/reports/monthly", async (req, res, next) => {
	try {
		const year = req.query.year !== void 0 ? parseInt(req.query.year, 10) : void 0;
		const month = req.query.month !== void 0 ? parseInt(req.query.month, 10) : void 0;
		const report = await getMonthlyReport(req.user.id, year, month);
		res.json(report);
	} catch (err) {
		next(err);
	}
});
//#endregion
//#region server/services/budgetService.ts
function evaluateBudget(budgetAmount, totalExpenses) {
	if (budgetAmount === 0) return {
		alert: false,
		message: "Budget tracking disabled",
		remaining: 0
	};
	if (totalExpenses > budgetAmount) return {
		alert: true,
		message: `Exceeded budget by GHS ${(totalExpenses - budgetAmount).toFixed(2)}`,
		remaining: 0
	};
	const remaining = budgetAmount - totalExpenses;
	return {
		alert: false,
		message: `GHS ${remaining.toFixed(2)} remaining`,
		remaining
	};
}
async function sumExpensesForPeriod(userId, month, year) {
	try {
		const raw = (await db.query(`SELECT COALESCE(SUM(amount), 0) AS total
       FROM expenses
       WHERE user_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR  FROM date) = $3`, [
			userId,
			month,
			year
		])).rows[0]?.total;
		if (raw !== void 0 && raw !== null) return parseFloat(raw);
	} catch {}
	return (await db.query("SELECT * FROM expenses WHERE user_id = $1", [userId])).rows.filter((r) => {
		const d = new Date(r.date);
		return d.getMonth() + 1 === month && d.getFullYear() === year;
	}).reduce((sum, r) => sum + parseFloat(r.amount), 0);
}
async function listBudgets(userId, month, year) {
	let sql = "SELECT * FROM budgets WHERE user_id = $1";
	const params = [userId];
	if (month !== void 0) {
		params.push(month);
		sql += ` AND month = $${params.length}`;
	}
	if (year !== void 0) {
		params.push(year);
		sql += ` AND year = $${params.length}`;
	}
	sql += " ORDER BY year DESC, month DESC";
	const result = await db.query(sql, params);
	return await Promise.all(result.rows.map(async (row) => {
		const totalExpenses = await sumExpensesForPeriod(userId, row.month, row.year);
		const evaluation = evaluateBudget(parseFloat(row.amount), totalExpenses);
		return {
			id: row.id,
			amount: String(row.amount),
			month: row.month,
			year: row.year,
			total_expenses: totalExpenses.toFixed(2),
			remaining: evaluation.remaining.toFixed(2),
			alert: evaluation.alert
		};
	}));
}
async function createBudget(userId, data) {
	if (data.amount < 0) throw new ValidationError("Amount must be >= 0", "amount");
	if (!Number.isInteger(data.month) || data.month < 1 || data.month > 12) throw new ValidationError("Month must be between 1 and 12", "month");
	if (!Number.isInteger(data.year) || data.year < 2e3) throw new ValidationError("Year must be >= 2000", "year");
	if ((await db.query("SELECT * FROM budgets WHERE user_id = $1", [userId])).rows.find((r) => r.month === data.month && r.year === data.year)) throw new ConflictError("Budget already exists for this period");
	let insertResult;
	try {
		insertResult = await db.query(`INSERT INTO budgets (user_id, amount, month, year) VALUES ($1, $2, $3, $4) RETURNING *`, [
			userId,
			data.amount,
			data.month,
			data.year
		]);
	} catch (err) {
		if (err?.code === "23505" || /unique|duplicate/i.test(err?.message ?? "")) throw new ConflictError("Budget already exists for this period");
		throw err;
	}
	const row = insertResult.rows[0];
	const totalExpenses = await sumExpensesForPeriod(userId, row.month, row.year);
	const evaluation = evaluateBudget(parseFloat(row.amount), totalExpenses);
	return {
		id: row.id,
		amount: String(row.amount),
		month: row.month,
		year: row.year,
		total_expenses: totalExpenses.toFixed(2),
		remaining: evaluation.remaining.toFixed(2),
		alert: evaluation.alert
	};
}
async function updateBudget(userId, id, data) {
	const existing = await db.query("SELECT * FROM budgets WHERE id = $1", [id]);
	if (existing.rows.length === 0) throw new NotFoundError("Budget not found");
	if (existing.rows[0].user_id !== userId) throw new ForbiddenError("You do not have permission to update this budget");
	if (data.amount < 0) throw new ValidationError("Amount must be >= 0", "amount");
	const row = (await db.query(`UPDATE budgets SET amount = $1, updated_at = NOW() WHERE id = $2 RETURNING *`, [data.amount, id])).rows[0];
	const totalExpenses = await sumExpensesForPeriod(userId, row.month, row.year);
	const evaluation = evaluateBudget(parseFloat(row.amount), totalExpenses);
	return {
		id: row.id,
		amount: String(row.amount),
		month: row.month,
		year: row.year,
		total_expenses: totalExpenses.toFixed(2),
		remaining: evaluation.remaining.toFixed(2),
		alert: evaluation.alert
	};
}
//#endregion
//#region server/routes/budgets.ts
var router$4 = (0, express.Router)();
router$4.use(authenticateJWT);
router$4.get("/budgets", async (req, res, next) => {
	try {
		const month = req.query.month ? parseInt(req.query.month) : void 0;
		const year = req.query.year ? parseInt(req.query.year) : void 0;
		const records = await listBudgets(req.user.id, month, year);
		res.json(records);
	} catch (err) {
		next(err);
	}
});
router$4.post("/budgets", async (req, res, next) => {
	try {
		const record = await createBudget(req.user.id, req.body);
		res.status(201).json(record);
	} catch (err) {
		next(err);
	}
});
router$4.put("/budgets/:id", async (req, res, next) => {
	try {
		const record = await updateBudget(req.user.id, parseInt(req.params.id), req.body);
		res.json(record);
	} catch (err) {
		next(err);
	}
});
//#endregion
//#region server/services/savingsService.ts
function computeProgress(currentSavings, targetAmount) {
	if (targetAmount <= 0) return 0;
	return Math.round(currentSavings / targetAmount * 100 * 100) / 100;
}
function deriveStatus(progress) {
	return progress >= 100 ? "achieved" : "active";
}
async function getCurrentSavings(userId) {
	const incomeRes = await db.query("SELECT * FROM income WHERE user_id = $1", [userId]);
	const expenseRes = await db.query("SELECT * FROM expenses WHERE user_id = $1", [userId]);
	return incomeRes.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0) - expenseRes.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
}
async function listSavingsGoals(userId) {
	const result = await db.query("SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
	const currentSavings = await getCurrentSavings(userId);
	return result.rows.map((row) => {
		const progress = computeProgress(currentSavings, parseFloat(row.target_amount));
		return {
			id: row.id,
			name: row.name,
			target_amount: row.target_amount,
			target_date: row.target_date,
			status: deriveStatus(progress),
			current_savings: currentSavings.toFixed(2),
			progress_percentage: progress
		};
	});
}
async function createSavingsGoal(userId, data) {
	if (!data.name) throw new ValidationError("Name is required", "name");
	if (!data.target_amount || data.target_amount <= 0) throw new ValidationError("Target amount must be greater than 0", "target_amount");
	if (!data.target_date) throw new ValidationError("Target date is required", "target_date");
	const targetDate = new Date(data.target_date);
	if (isNaN(targetDate.getTime()) || targetDate <= /* @__PURE__ */ new Date()) throw new ValidationError("Target date must be in the future", "target_date");
	const row = (await db.query("INSERT INTO savings_goals (user_id, name, target_amount, target_date) VALUES ($1, $2, $3, $4) RETURNING *", [
		userId,
		data.name,
		data.target_amount,
		data.target_date
	])).rows[0];
	return {
		id: row.id,
		name: row.name,
		target_amount: row.target_amount,
		target_date: row.target_date,
		status: "active",
		current_savings: "0.00",
		progress_percentage: 0
	};
}
async function updateSavingsGoal(userId, id, data) {
	const existing = await db.query("SELECT * FROM savings_goals WHERE id = $1", [id]);
	if (existing.rows.length === 0) throw new NotFoundError("Savings goal not found");
	if (existing.rows[0].user_id !== userId) throw new ForbiddenError("Forbidden");
	if (data.target_amount !== void 0 && data.target_amount <= 0) throw new ValidationError("Target amount must be greater than 0", "target_amount");
	const row = existing.rows[0];
	const newName = data.name ?? row.name;
	const newAmount = data.target_amount ?? parseFloat(row.target_amount);
	const newDate = data.target_date ?? row.target_date;
	await db.query("UPDATE savings_goals SET name=$1, target_amount=$2, target_date=$3, updated_at=NOW() WHERE id=$4", [
		newName,
		newAmount,
		newDate,
		id
	]);
	const updated = (await listSavingsGoals(userId)).find((g) => g.id === id);
	if (!updated) throw new NotFoundError("Savings goal not found after update");
	return updated;
}
//#endregion
//#region server/routes/savingsGoals.ts
var router$3 = (0, express.Router)();
router$3.use(authenticateJWT);
router$3.get("/savings-goals", async (req, res, next) => {
	try {
		const goals = await listSavingsGoals(req.user.id);
		res.json(goals);
	} catch (err) {
		next(err);
	}
});
router$3.post("/savings-goals", async (req, res, next) => {
	try {
		const goal = await createSavingsGoal(req.user.id, req.body);
		res.status(201).json(goal);
	} catch (err) {
		next(err);
	}
});
router$3.put("/savings-goals/:id", async (req, res, next) => {
	try {
		const goal = await updateSavingsGoal(req.user.id, parseInt(req.params.id), req.body);
		res.json(goal);
	} catch (err) {
		next(err);
	}
});
//#endregion
//#region server/services/recurringService.ts
function computeNextRunAt(from, interval) {
	const d = new Date(from);
	if (interval === "daily") d.setDate(d.getDate() + 1);
	else if (interval === "weekly") d.setDate(d.getDate() + 7);
	else if (interval === "monthly") d.setMonth(d.getMonth() + 1);
	return d;
}
async function listRecurring(userId) {
	return (await db.query("SELECT * FROM recurring_expenses WHERE user_id = $1 AND status = 'active' ORDER BY next_run_at ASC", [userId])).rows;
}
async function createRecurring(userId, data) {
	if (!data.amount || data.amount <= 0) throw new ValidationError("Amount must be greater than 0", "amount");
	if (!data.category) throw new ValidationError("Category is required", "category");
	if (!data.description) throw new ValidationError("Description is required", "description");
	if (![
		"daily",
		"weekly",
		"monthly"
	].includes(data.interval)) throw new ValidationError("Interval must be daily, weekly, or monthly", "interval");
	const nextRunAt = computeNextRunAt(/* @__PURE__ */ new Date(), data.interval);
	return (await db.query(`INSERT INTO recurring_expenses (user_id, amount, category, description, interval, next_run_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [
		userId,
		data.amount,
		data.category,
		data.description,
		data.interval,
		nextRunAt.toISOString()
	])).rows[0];
}
async function deactivateRecurring(userId, id) {
	const existing = await db.query("SELECT * FROM recurring_expenses WHERE id = $1", [id]);
	if (existing.rows.length === 0) throw new NotFoundError("Recurring expense not found");
	if (existing.rows[0].user_id !== userId) throw new ForbiddenError("Forbidden");
	try {
		await db.query("BEGIN");
		const result = await db.query("UPDATE recurring_expenses SET status = 'inactive', updated_at = NOW() WHERE id = $1 RETURNING *", [id]);
		await db.query("COMMIT");
		return result.rows[0];
	} catch (err) {
		await db.query("ROLLBACK");
		throw err;
	}
}
async function processScheduled() {
	const due = await db.query("SELECT * FROM recurring_expenses WHERE status = 'active' AND next_run_at <= NOW()");
	for (const item of due.rows) try {
		await db.query("BEGIN");
		await db.query("INSERT INTO expenses (user_id, amount, category, description, date) VALUES ($1, $2, $3, $4, $5)", [
			item.user_id,
			item.amount,
			item.category,
			item.description,
			(/* @__PURE__ */ new Date()).toISOString().split("T")[0]
		]);
		const next = computeNextRunAt(/* @__PURE__ */ new Date(), item.interval);
		await db.query("UPDATE recurring_expenses SET next_run_at = $1, updated_at = NOW() WHERE id = $2", [next.toISOString(), item.id]);
		await db.query("COMMIT");
	} catch (err) {
		await db.query("ROLLBACK");
		console.error(`[RecurringService] Failed for id=${item.id}:`, err);
	}
}
//#endregion
//#region server/routes/recurringExpenses.ts
var router$2 = (0, express.Router)();
router$2.use(authenticateJWT);
router$2.get("/recurring-expenses", async (req, res, next) => {
	try {
		const items = await listRecurring(req.user.id);
		res.json(items);
	} catch (err) {
		next(err);
	}
});
router$2.post("/recurring-expenses", async (req, res, next) => {
	try {
		const item = await createRecurring(req.user.id, req.body);
		res.status(201).json(item);
	} catch (err) {
		next(err);
	}
});
router$2.put("/recurring-expenses/:id/deactivate", async (req, res, next) => {
	try {
		const item = await deactivateRecurring(req.user.id, parseInt(req.params.id));
		res.json(item);
	} catch (err) {
		next(err);
	}
});
//#endregion
//#region server/services/ocrService.ts
function parseReceiptText(text) {
	const amountMatch = text.match(/(?:total|amount|paid|ghs|₵)\s*:?\s*([\d,]+\.?\d{0,2})/i);
	let amountValue = null;
	if (amountMatch) amountValue = parseFloat(amountMatch[1].replace(/,/g, "")).toFixed(2);
	const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
	let dateValue = null;
	if (dateMatch) dateValue = dateMatch[0];
	const vendorValue = text.split("\n").map((l) => l.trim()).filter(Boolean)[0] ?? null;
	return { extracted: {
		amount: {
			value: amountValue,
			found: amountValue !== null
		},
		date: {
			value: dateValue,
			found: dateValue !== null
		},
		vendor: {
			value: vendorValue,
			found: vendorValue !== null
		}
	} };
}
async function extractReceiptData(buffer) {
	try {
		const { createWorker } = await import("tesseract.js");
		const worker = await createWorker("eng");
		const { data: { text } } = await worker.recognize(buffer);
		await worker.terminate();
		return parseReceiptText(text);
	} catch {
		console.warn("[OCRService] Tesseract.js not available or failed. Returning empty result.");
		return { extracted: {
			amount: {
				value: null,
				found: false
			},
			date: {
				value: null,
				found: false
			},
			vendor: {
				value: null,
				found: false
			}
		} };
	}
}
//#endregion
//#region server/routes/ocr.ts
var ALLOWED_MIMES = [
	"image/jpeg",
	"image/png",
	"application/pdf"
];
var upload = (0, multer.default)({
	storage: multer.default.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
		else cb(/* @__PURE__ */ new Error("UNSUPPORTED_MEDIA_TYPE"));
	}
});
var router$1 = (0, express.Router)();
router$1.use(authenticateJWT);
router$1.post("/receipts/ocr", (req, res, next) => {
	upload.single("receipt")(req, res, (err) => {
		if (err) {
			if (err instanceof multer.default.MulterError && err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "File too large. Maximum size is 10 MB." });
			if (err instanceof Error && err.message === "UNSUPPORTED_MEDIA_TYPE") return res.status(415).json({ error: "Unsupported file type. Use JPEG, PNG, or PDF." });
			return next(err);
		}
		if (!req.file) return res.status(400).json({ error: "No file uploaded. Use field name 'receipt'." });
		extractReceiptData(req.file.buffer).then((result) => res.json(result)).catch((err) => next(err));
	});
});
//#endregion
//#region server/services/exportService.ts
async function generatePDF(report, transactions) {
	const PDFDocument = (await import("pdfkit")).default;
	const doc = new PDFDocument({ margin: 50 });
	const chunks = [];
	return new Promise((resolve, reject) => {
		doc.on("data", (chunk) => chunks.push(chunk));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);
		const monthName = new Date(report.year, report.month - 1).toLocaleString("default", { month: "long" });
		doc.fontSize(20).text(`Financial Report — ${monthName} ${report.year}`, { align: "center" });
		doc.moveDown();
		doc.fontSize(14).text("Summary", { underline: true });
		doc.moveDown(.5);
		doc.fontSize(11).text(`Total Income:    GHS ${report.total_income}`);
		doc.text(`Total Expenses:  GHS ${report.total_expenses}`);
		doc.text(`Savings:         GHS ${report.savings}`);
		doc.moveDown();
		doc.fontSize(14).text("Transactions", { underline: true });
		doc.moveDown(.5);
		doc.fontSize(10);
		const col = {
			date: 50,
			category: 130,
			description: 250,
			amount: 460
		};
		doc.font("Helvetica-Bold").text("Date", col.date, doc.y, { continued: false });
		const headerY = doc.y - 12;
		doc.text("Date", col.date, headerY);
		doc.text("Category", col.category, headerY);
		doc.text("Description", col.description, headerY);
		doc.text("Amount (GHS)", col.amount, headerY);
		doc.moveDown(.5);
		doc.font("Helvetica");
		if (transactions.length === 0) doc.text("No transactions for this period.");
		else for (const tx of transactions) {
			const y = doc.y;
			doc.text(tx.date ?? "", col.date, y);
			doc.text(tx.category ?? "", col.category, y);
			doc.text(tx.description ?? "", col.description, y, { width: 200 });
			doc.text(tx.amount ?? "0.00", col.amount, y);
			doc.moveDown(.3);
		}
		doc.end();
	});
}
async function generateExcel(report, transactions) {
	const workbook = new (await (import("exceljs"))).Workbook();
	const summarySheet = workbook.addWorksheet("Summary");
	summarySheet.columns = [{
		header: "Metric",
		key: "metric",
		width: 25
	}, {
		header: "Amount (GHS)",
		key: "amount",
		width: 20
	}];
	summarySheet.addRow({
		metric: "Total Income",
		amount: report.total_income
	});
	summarySheet.addRow({
		metric: "Total Expenses",
		amount: report.total_expenses
	});
	summarySheet.addRow({
		metric: "Savings",
		amount: report.savings
	});
	const txSheet = workbook.addWorksheet("Transactions");
	txSheet.columns = [
		{
			header: "Date",
			key: "date",
			width: 15
		},
		{
			header: "Category",
			key: "category",
			width: 20
		},
		{
			header: "Description",
			key: "description",
			width: 35
		},
		{
			header: "Amount (GHS)",
			key: "amount",
			width: 20
		}
	];
	for (const tx of transactions) txSheet.addRow({
		date: tx.date,
		category: tx.category,
		description: tx.description ?? "",
		amount: tx.amount
	});
	const buffer = await workbook.xlsx.writeBuffer();
	return Buffer.from(buffer);
}
//#endregion
//#region server/routes/export.ts
var router = (0, express.Router)();
router.use(authenticateJWT);
async function getTransactionsForPeriod(userId, year, month) {
	const allInc = await db.query("SELECT *, 'income' AS type FROM income WHERE user_id = $1", [userId]);
	const allExp = await db.query("SELECT *, 'expense' AS type FROM expenses WHERE user_id = $1", [userId]);
	const filter = (r) => {
		const d = new Date(r.date);
		return d.getFullYear() === year && d.getMonth() + 1 === month;
	};
	return [...allInc.rows.filter(filter), ...allExp.rows.filter(filter)].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
router.get("/export/pdf", async (req, res, next) => {
	try {
		const year = req.query.year ? parseInt(req.query.year) : void 0;
		const month = req.query.month ? parseInt(req.query.month) : void 0;
		const report = await getMonthlyReport(req.user.id, year, month);
		const pdf = await generatePDF(report, await getTransactionsForPeriod(req.user.id, report.year, report.month));
		const filename = `report-${report.year}-${String(report.month).padStart(2, "0")}.pdf`;
		res.set("Content-Type", "application/pdf");
		res.set("Content-Disposition", `attachment; filename="${filename}"`);
		res.send(pdf);
	} catch (err) {
		next(err);
	}
});
router.get("/export/excel", async (req, res, next) => {
	try {
		const year = req.query.year ? parseInt(req.query.year) : void 0;
		const month = req.query.month ? parseInt(req.query.month) : void 0;
		const report = await getMonthlyReport(req.user.id, year, month);
		const xlsx = await generateExcel(report, await getTransactionsForPeriod(req.user.id, report.year, report.month));
		const filename = `report-${report.year}-${String(report.month).padStart(2, "0")}.xlsx`;
		res.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
		res.set("Content-Disposition", `attachment; filename="${filename}"`);
		res.send(xlsx);
	} catch (err) {
		next(err);
	}
});
//#endregion
//#region server/index.ts
async function createServer() {
	await initializeDb();
	node_cron.default.schedule("*/5 * * * *", () => {
		processScheduled().catch((err) => console.error("[Cron] processScheduled failed:", err));
	});
	const app = (0, express.default)();
	app.use((0, cors.default)());
	app.use(express.default.json());
	app.use(express.default.urlencoded({ extended: true }));
	app.get("/api/ping", (_req, res) => {
		const ping = process.env.PING_MESSAGE ?? "ping";
		res.json({ message: ping });
	});
	app.get("/api/debug/status", (_req, res) => {
		res.json({
			db: process.env.DATABASE_URL ? "postgresql (configured)" : "in-memory fallback",
			host: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : "none",
			jwt_secret_set: !!process.env.JWT_SECRET
		});
	});
	app.get("/api/demo", handleDemo);
	app.use("/api", router$8);
	app.use("/api", router$7);
	app.use("/api", router$6);
	app.use("/api", router$4);
	app.use("/api", router$5);
	app.use("/api", router$3);
	app.use("/api", router$2);
	app.use("/api", router$1);
	app.use("/api", router);
	app.use((err, _req, res, _next) => {
		const r = res;
		if (err instanceof ValidationError) return r.status(422).json({
			error: err.message,
			field: err.field
		});
		if (err instanceof AuthError) return r.status(401).json({ error: err.message });
		if (err instanceof ForbiddenError) return r.status(403).json({ error: err.message });
		if (err instanceof NotFoundError) return r.status(404).json({ error: err.message });
		if (err instanceof ConflictError) return r.status(409).json({ error: err.message });
		console.error("[Server Error]", err);
		return r.status(500).json({ error: err.message ?? "Internal server error" });
	});
	return app;
}
//#endregion
//#region netlify/functions/api.ts
var cachedHandler = null;
var handler = async (event, context) => {
	if (!cachedHandler) cachedHandler = (0, serverless_http.default)(await createServer());
	return cachedHandler(event, context);
};
//#endregion
exports.handler = handler;
