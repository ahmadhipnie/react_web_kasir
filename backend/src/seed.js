require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./config/database');

const seed = async () => {
  try {
    console.log('Starting database seeding...');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Check if admin exists
    const [existingUsers] = await db.execute('SELECT id FROM users WHERE username = ?', ['admin']);
    
    if (existingUsers.length === 0) {
      await db.execute(
        `INSERT INTO users (username, password, full_name, email, role, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['admin', hashedPassword, 'Administrator', 'admin@foodpos.com', 'admin', 'active']
      );
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }

    // Create cashier user
    const [existingCashier] = await db.execute('SELECT id FROM users WHERE username = ?', ['cashier']);
    
    if (existingCashier.length === 0) {
      const cashierPassword = await bcrypt.hash('cashier123', 10);
      await db.execute(
        `INSERT INTO users (username, password, full_name, email, role, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['cashier', cashierPassword, 'Cashier User', 'cashier@foodpos.com', 'cashier', 'active']
      );
      console.log('Cashier user created successfully');
    } else {
      console.log('Cashier user already exists');
    }

    // Create sample categories
    const categories = [
      { name: 'Main Course', description: 'Main dishes and meals' },
      { name: 'Beverages', description: 'Drinks and refreshments' },
      { name: 'Desserts', description: 'Sweet treats and desserts' },
      { name: 'Snacks', description: 'Light bites and appetizers' },
      { name: 'Fast Food', description: 'Quick service food items' }
    ];

    for (const cat of categories) {
      const [existing] = await db.execute('SELECT id FROM categories WHERE category_name = ?', [cat.name]);
      if (existing.length === 0) {
        await db.execute(
          'INSERT INTO categories (category_name, description) VALUES (?, ?)',
          [cat.name, cat.description]
        );
        console.log(`Category "${cat.name}" created`);
      }
    }

    // Get category IDs
    const [mainCourse] = await db.execute('SELECT id FROM categories WHERE category_name = ?', ['Main Course']);
    const [beverages] = await db.execute('SELECT id FROM categories WHERE category_name = ?', ['Beverages']);
    const [desserts] = await db.execute('SELECT id FROM categories WHERE category_name = ?', ['Desserts']);
    const [snacks] = await db.execute('SELECT id FROM categories WHERE category_name = ?', ['Snacks']);
    const [fastFood] = await db.execute('SELECT id FROM categories WHERE category_name = ?', ['Fast Food']);

    // Create sample foods (prices in USD)
    const foods = [
      { code: 'FD001', name: 'Fried Rice', category_id: mainCourse[0]?.id, price: 8.99, stock: 100, description: 'Delicious Indonesian fried rice' },
      { code: 'FD002', name: 'Chicken Satay', category_id: mainCourse[0]?.id, price: 10.99, stock: 50, description: 'Grilled chicken skewers with peanut sauce' },
      { code: 'FD003', name: 'Iced Tea', category_id: beverages[0]?.id, price: 2.49, stock: 200, description: 'Refreshing iced tea' },
      { code: 'FD004', name: 'Orange Juice', category_id: beverages[0]?.id, price: 3.99, stock: 150, description: 'Fresh squeezed orange juice' },
      { code: 'FD005', name: 'Chocolate Cake', category_id: desserts[0]?.id, price: 6.99, stock: 30, description: 'Rich chocolate layer cake' },
      { code: 'FD006', name: 'Ice Cream', category_id: desserts[0]?.id, price: 4.99, stock: 80, description: 'Creamy vanilla ice cream' },
      { code: 'FD007', name: 'French Fries', category_id: snacks[0]?.id, price: 4.99, stock: 100, description: 'Crispy golden fries' },
      { code: 'FD008', name: 'Chicken Wings', category_id: snacks[0]?.id, price: 8.99, stock: 60, description: 'Spicy buffalo wings' },
      { code: 'FD009', name: 'Burger', category_id: fastFood[0]?.id, price: 12.99, stock: 40, description: 'Classic beef burger with cheese' },
      { code: 'FD010', name: 'Pizza', category_id: fastFood[0]?.id, price: 15.99, stock: 25, description: 'Pepperoni pizza' }
    ];

    for (const food of foods) {
      if (food.category_id) {
        const [existing] = await db.execute('SELECT id FROM foods WHERE food_code = ?', [food.code]);
        if (existing.length === 0) {
          await db.execute(
            'INSERT INTO foods (food_code, food_name, category_id, price, stock, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [food.code, food.name, food.category_id, food.price, food.stock, food.description, 'available']
          );
          console.log(`Food "${food.name}" created`);
        }
      }
    }

    console.log('Database seeding completed successfully!');
    console.log('\nDefault login credentials:');
    console.log('Admin - Username: admin, Password: admin123');
    console.log('Cashier - Username: cashier, Password: cashier123');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seed();
