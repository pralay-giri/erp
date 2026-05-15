import seedUsers from './userSeeder.js';
import seedProducts from './productSeeder.js';
import seedLeads from './leadSeeder.js';

const runAllSeeders = async () => {
  console.log('🚀 Starting Master Seeder...');
  
  // Orders matter because Leads depend on Users
  await seedUsers();
  await seedProducts();
  await seedLeads();
  
  console.log('🏁 All seeding operations complete.');
};

export default runAllSeeders;
