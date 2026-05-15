import { User } from '../models/index.js';

const seedUsers = async () => {
  try {
    const userCount = await User.count();
    
    if (userCount === 0) {
      console.log('🌱 Seeding initial users...');
      
      await User.bulkCreate([
        {
          id: '1ed30055-d801-4267-bbc1-9e329f4c11ea',
          name: 'Admin User',
          email: 'admin@company.com',
          password: 'adminpassword',
          role: 'admin'
        },
        {
          id: 'c23cf398-7960-49ef-a263-7b08f3271aed',
          name: 'Sarah Sales',
          email: 'sarah@company.com',
          password: 'salespassword',
          role: 'sales'
        },
        {
          id: '7c42123f-cd9f-435e-b9b2-cd5b47ea0953',
          name: 'Wally Warehouse',
          email: 'wally@company.com',
          password: '1234',
          role: 'warehouse'
        }
      ], { individualHooks: true }); // Ensure hooks (hashing) are run
      
      console.log('✅ Users seeded successfully.');
    } else {
      console.log('ℹ️ Users already exist, skipping seeding.');
    }
  } catch (error) {
    console.error('❌ Error seeding users:', error);
  }
};

export default seedUsers;
