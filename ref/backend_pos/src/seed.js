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

    // Create admin user with Node.js bcrypt hash
    const hashedPassword = await bcrypt.hash('admin123', 10);

    if (existingUsers.length > 0) {
      console.log('Admin user already exists. Updating password...');
      await db.execute(
        'UPDATE users SET password = ? WHERE username = ?',
        [hashedPassword, 'admin']
      );
      console.log('✅ Admin password updated successfully!');
    } else {
      console.log('Creating new admin user...');
      await db.execute(
        'INSERT INTO users (username, password, nama_lengkap, role) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'Administrator', 'admin']
      );
      console.log('✅ Admin user created successfully!');
    }

    console.log('');
    console.log('📝 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
