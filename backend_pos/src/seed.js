require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function seed() {
  try {
    // Check if admin exists
    const [existingUsers] = await db.execute(
      'SELECT * FROM users WHERE username = ?',
      ['admin']
    );

    if (existingUsers.length > 0) {
      console.log('Admin user already exists!');
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await db.execute(
      'INSERT INTO users (username, password, nama, role) VALUES (?, ?, ?, ?)',
      ['admin', hashedPassword, 'Administrator', 'admin']
    );

    console.log('Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
