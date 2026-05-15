import { Product } from '../models/index.js';

const seedProducts = async () => {
  try {
    const productCount = await Product.count();

    if (productCount === 0) {
      console.log('🌱 Seeding initial products...');

      await Product.bulkCreate([
        // ── Laptops & Computing ──────────────────────────────────────────
        {
          id: 'f18ea437-1cee-400b-a244-77c5e19d01a2',
          name: 'High-End Laptop',
          sku: 'LAP-001',
          price: 1200.00,
          current_stock: 15,
        },
        {
          id: 'a1b2c3d4-0001-0001-0001-000000000001',
          name: 'Business Ultrabook',
          sku: 'LAP-002',
          price: 950.00,
          current_stock: 20,
        },
        {
          id: 'a1b2c3d4-0001-0001-0001-000000000002',
          name: 'Budget Laptop',
          sku: 'LAP-003',
          price: 480.00,
          current_stock: 30,
        },
        {
          id: 'a1b2c3d4-0001-0001-0001-000000000003',
          name: 'Gaming Laptop',
          sku: 'LAP-004',
          price: 1850.00,
          current_stock: 8,
        },

        // ── Peripherals ──────────────────────────────────────────────────
        {
          id: 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
          name: 'Mechanical Keyboard',
          sku: 'KB-404',
          price: 150.00,
          current_stock: 60,
        },
        {
          id: 'a1b2c3d4-0002-0002-0002-000000000001',
          name: 'Wireless Keyboard',
          sku: 'KB-405',
          price: 85.00,
          current_stock: 80,
        },
        {
          id: 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
          name: 'Ergonomic Mouse',
          sku: 'MSE-902',
          price: 80.00,
          current_stock: 120,
        },
        {
          id: 'a1b2c3d4-0003-0003-0003-000000000001',
          name: 'Wireless Mouse',
          sku: 'MSE-903',
          price: 45.00,
          current_stock: 150,
        },
        {
          id: 'a1b2c3d4-0003-0003-0003-000000000002',
          name: 'Gaming Mouse',
          sku: 'MSE-904',
          price: 120.00,
          current_stock: 40,
        },

        // ── Monitors ─────────────────────────────────────────────────────
        {
          id: 'e4b4b4b4-b4b4-b4b4-b4b4-b4b4b4b4b4b4',
          name: '27-inch 4K Monitor',
          sku: 'MON-777',
          price: 550.00,
          current_stock: 12,
        },
        {
          id: 'a1b2c3d4-0004-0004-0004-000000000001',
          name: '24-inch FHD Monitor',
          sku: 'MON-778',
          price: 220.00,
          current_stock: 25,
        },
        {
          id: 'a1b2c3d4-0004-0004-0004-000000000002',
          name: '32-inch Curved Monitor',
          sku: 'MON-779',
          price: 680.00,
          current_stock: 0,
        },

        // ── Cables & Accessories ─────────────────────────────────────────
        {
          id: 'd5d5d5d5-d5d5-d5d5-d5d5-d5d5d5d5d5d5',
          name: 'USB-C Cable (2m)',
          sku: 'CBL-101',
          price: 25.00,
          current_stock: 500,
        },
        {
          id: 'a1b2c3d4-0005-0005-0005-000000000001',
          name: 'HDMI Cable (2m)',
          sku: 'CBL-102',
          price: 18.00,
          current_stock: 350,
        },
        {
          id: 'a1b2c3d4-0005-0005-0005-000000000002',
          name: 'DisplayPort Cable (1.5m)',
          sku: 'CBL-103',
          price: 22.00,
          current_stock: 200,
        },

        // ── Storage ──────────────────────────────────────────────────────
        {
          id: 'a1b2c3d4-0006-0006-0006-000000000001',
          name: 'SSD 1TB (NVMe)',
          sku: 'SSD-001',
          price: 95.00,
          current_stock: 75,
        },
        {
          id: 'a1b2c3d4-0006-0006-0006-000000000002',
          name: 'SSD 512GB (SATA)',
          sku: 'SSD-002',
          price: 55.00,
          current_stock: 90,
        },
        {
          id: 'a1b2c3d4-0006-0006-0006-000000000003',
          name: 'External HDD 2TB',
          sku: 'HDD-001',
          price: 75.00,
          current_stock: 40,
        },

        // ── Networking ───────────────────────────────────────────────────
        {
          id: 'a1b2c3d4-0007-0007-0007-000000000001',
          name: 'Wi-Fi 6 Router',
          sku: 'NET-001',
          price: 130.00,
          current_stock: 30,
        },
        {
          id: 'a1b2c3d4-0007-0007-0007-000000000002',
          name: 'Network Switch (8-port)',
          sku: 'NET-002',
          price: 60.00,
          current_stock: 20,
        },

        // ── Power & Docking ──────────────────────────────────────────────
        {
          id: 'a1b2c3d4-0008-0008-0008-000000000001',
          name: 'USB-C Docking Station',
          sku: 'DOCK-001',
          price: 180.00,
          current_stock: 25,
        },
        {
          id: 'a1b2c3d4-0008-0008-0008-000000000002',
          name: '65W GaN Charger',
          sku: 'PWR-001',
          price: 48.00,
          current_stock: 200,
        },
        {
          id: 'a1b2c3d4-0008-0008-0008-000000000003',
          name: 'UPS 600VA',
          sku: 'PWR-002',
          price: 95.00,
          current_stock: 0,
        },
      ]);

      console.log('✅ Products seeded successfully (23 products).');
    } else {
      console.log('ℹ️ Products already exist, skipping seeding.');
    }
  } catch (error) {
    console.error('❌ Error seeding products:', error);
  }
};

export default seedProducts;
