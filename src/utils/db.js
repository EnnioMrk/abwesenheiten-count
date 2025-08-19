/**
 * Database helper module for PostgreSQL operations
 * @module helpers/db
 */
import pg from 'pg';
// Remove bcryptjs import and use Bun's built-in password hashing

const { Pool } = pg;

/**
 * PostgreSQL connection pool
 * @type {pg.Pool}
 */
let pool;
let isConnecting = false;

async function testConnection(client) {
    try {
        await client.query('SELECT 1');
        return true;
    } catch (err) {
        console.error('❌ Connection test failed:', err);
        return false;
    }
}

async function connectDb() {
    if (isConnecting) {
        console.log('🔄 Connection attempt already in progress...');
        return;
    }

    isConnecting = true;

    try {
        if (pool) {
            try {
                const client = await pool.connect();
                const isConnected = await testConnection(client);
                client.release();

                if (isConnected) {
                    console.log('✅ Database connection is healthy');
                    isConnecting = false;
                    return;
                }
            } catch (err) {
                console.log(
                    '🔄 Existing pool is unhealthy, creating new connection...'
                );
            }
        }

        pool = new Pool({
            user: process.env.PG_USER,
            password: process.env.PG_PASSWORD,
            host: process.env.PG_HOST,
            database: process.env.PG_DB,
            ssl: true,
            min: 1,
            max: 10,
            createTimeoutMillis: 8000,
            acquireTimeoutMillis: 8000,
            idleTimeoutMillis: 1000 * 60 * 5,
            reapIntervalMillis: 1000,
            createRetryIntervalMillis: 100,
        });

        // Test the new connection
        const client = await pool.connect();
        const isConnected = await testConnection(client);
        client.release();

        if (!isConnected) {
            throw new Error('Failed to establish database connection');
        }

        pool.on('error', async (err) => {
            console.error('❌ Pool error:', err);
            if (!isConnecting) {
                console.log('🔄 Attempting to reconnect to database...');
                await connectDb();
            }
        });

        console.log('💾 Connected to database');
    } catch (err) {
        console.error('❌ Database connection error:', err);
        // Wait before retrying
        setTimeout(() => {
            isConnecting = false;
            connectDb();
        }, 5000);
    } finally {
        isConnecting = false;
    }
}

// Initial connection
connectDb();

/**
 * Returns the PostgreSQL client pool
 * @returns {pg.Pool} The PostgreSQL client pool
 */
export function getDb() {
    return pool;
}

/**
 * Adds a new user to the database with Untis data
 * @async
 * @param {string} email - User's email address
 * @param {string} passwordHash - User's hashed password
 * @param {Object} untisData - User's Untis configuration data
 * @returns {Promise<Object>} Result of the database operation
 */
export async function addUser(email, passwordHash, untisData) {
    const query = `
        INSERT INTO users (email, password_hash, untis_data) 
        VALUES ($1, $2, $3)
        RETURNING id
    `;
    const values = [email, passwordHash, JSON.stringify(untisData)];
    const result = await pool.query(query, values);
    return result.rows[0];
}

/**
 * Creates a new user with subscription information
 * @async
 * @param {Object} userData - User data including email, password, plan details and subscription info
 * @returns {Promise<Object>} The created user object
 */
export async function saveNewUser(userData) {
    const {
        email,
        firstName,
        lastName,
        password,
        plan,
        customerId,
        subscriptionId,
    } = userData;

    // Hash the password using Bun's built-in password hashing
    const passwordHash = await Bun.password.hash(password);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Insert the new user
        const insertQuery = `
            INSERT INTO users (
                email, 
                password_hash, 
                first_name, 
                last_name, 
                plan, 
                customer_id, 
                subscription_id,
                created_at
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            RETURNING id, email, first_name, last_name, plan, subscription_status
        `;

        const values = [
            email,
            passwordHash,
            firstName,
            lastName,
            plan,
            customerId,
            subscriptionId,
        ];

        const result = await client.query(insertQuery, values);
        await client.query('COMMIT');

        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error saving new user:', error);
        throw error;
    } finally {
        client.release();
    }
}
/**
 * Get a user by email address
 * @async
 * @param {string} email - The user's email address
 * @param {string} untisUrl - The user's untis url
 * @returns {Promise<Object|null>} The user object if found, null otherwise
 */
export async function saveUntisUrl(email, untisUrl) {
    const query = `
        UPDATE users
        SET untis_url = $1
        WHERE email = $2
    `;
    const values = [untisUrl, email];
    await pool
        .query(query, values)
        .then((result) => {
            return result.rows[0];
        })
        .catch((error) => {
            console.error('❌ Error saving Untis URL:', error);
            throw error;
        });
}

export async function getUntisUrl(email) {
    const query = `
        SELECT untis_url
        FROM users
        WHERE email = $1
    `;
    const values = [email];
    const result = await pool.query(query, values).catch((error) => {
        console.error('❌ Error getting Untis URL:', error);
        throw error;
    });
    return result.rows[0]?.untis_url;
}

/**
 * Verify a user's password
 * @async
 * @param {string} email - The user's email address
 * @param {string} password - The password to verify
 * @returns {Promise<Object|null>} The user object if password is correct, null otherwise
 */
export async function verifyUserPassword(email, password) {
    try {
        // Get user from database
        const query = `
            SELECT id, email, password_hash, first_name, last_name, plan, subscription_status 
            FROM users 
            WHERE email = $1
        `;
        const result = await pool.query(query, [email]);

        // If no user found, return null
        if (result.rows.length === 0) {
            return null;
        }

        const user = result.rows[0];
        const passwordHash = user.password_hash;

        // Verify password using Bun's password verification
        const isValid = await Bun.password.verify(password, passwordHash);

        if (isValid) {
            // Don't return the password hash to the calling function
            delete user.password_hash;
            return user;
        } else {
            return null;
        }
    } catch (error) {
        console.error('🔒 Error verifying user password:', error);
        throw error;
    }
}

/**
 * Get all widgets from the database
 * @async
 * @returns {Promise<Array>} Array of widget objects
 */
export async function getWidgets() {
    const query = `
        SELECT *
        FROM widgets
    `;
    const result = await pool.query(query);
    return result.rows;
}

/**
 * Initialize the database by creating required tables if they don't exist
 * @async
 * @returns {Promise<void>}
 */
export async function initializeDb() {
    const client = await pool.connect();
    try {
        // Create the table with email instead of username
        await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    first_name VARCHAR(255),
                    last_name VARCHAR(255),
                    plan VARCHAR(50),
                    customer_id VARCHAR(255),
                    subscription_id VARCHAR(255),
                    subscription_status VARCHAR(50) DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    untis_url VARCHAR(255)
                );
            `);

        await client.query(`
                CREATE TABLE IF NOT EXISTS widgets (
                    id varchar(255) PRIMARY KEY,
                    title varchar(255) NOT NULL,
                    description text,
                    icon varchar(10),
                    minPlan integer DEFAULT 0
                )
            `);

        console.log('✅ Users and widgets tables created/verified');

        // Seed the widgets table with default data (inline to avoid pool dependency issues)
        const checkQuery = `SELECT COUNT(*) FROM widgets`;
        const checkResult = await client.query(checkQuery);
        const widgetCount = parseInt(checkResult.rows[0].count);

        if (widgetCount === 0) {
            console.log('🌱 Seeding widgets table with default widgets...');

            const defaultWidgets = [
                {
                    id: 'absences-summary',
                    title: 'Absence Summary',
                    description: 'Overview of your absences',
                    icon: '📊',
                    minPlan: 0,
                },
                {
                    id: 'absences-trend',
                    title: 'Absence Trend',
                    description: 'Trend over time',
                    icon: '📈',
                    minPlan: 0,
                },
                {
                    id: 'all-time',
                    title: 'All Time Stats',
                    description: 'Complete statistics',
                    icon: '🏆',
                    minPlan: 0,
                },
                {
                    id: 'last-7-days',
                    title: 'Last 7 Days',
                    description: 'Weekly overview',
                    icon: '📅',
                    minPlan: 0,
                },
                {
                    id: 'last-14-days',
                    title: 'Last 14 Days',
                    description: '2 weeks overview',
                    icon: '📋',
                    minPlan: 0,
                },
                {
                    id: 'last-30-days',
                    title: 'Last 30 Days',
                    description: 'Monthly overview',
                    icon: '📆',
                    minPlan: 0,
                },
            ];

            for (const widget of defaultWidgets) {
                const insertQuery = `
          INSERT INTO widgets (id, title, description, icon, minPlan)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING
        `;
                await client.query(insertQuery, [
                    widget.id,
                    widget.title,
                    widget.description,
                    widget.icon,
                    widget.minPlan,
                ]);
            }

            console.log(
                `✅ Successfully seeded ${defaultWidgets.length} widgets`
            );
        } else {
            console.log(`✅ Widgets table already has ${widgetCount} widgets`);
        }
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error initializing database:', err);
        throw err;
    } finally {
        client.release();
    }
}

// Initialize the database when this module is first loaded
initializeDb();
