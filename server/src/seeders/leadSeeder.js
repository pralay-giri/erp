import { Lead, User } from '../models/index.js';

const seedLeads = async () => {
  try {
    const leadCount = await Lead.count();

    if (leadCount === 0) {
      console.log('🌱 Seeding initial leads...');

      const sarah = await User.findOne({ where: { email: 'sarah@company.com' } });

      if (!sarah) {
        console.warn('⚠️ Sarah Sales not found, skipping lead seeding.');
        return;
      }

      await Lead.bulkCreate([

        // ── Assigned to Sarah — NEW ──────────────────────────────────────
        {
          id: '9b81a0c3-236a-4438-9724-bc693324c70b',
          customer_name: 'Global Tech Solutions',
          phone:         '+91 98765 43210',
          email:         'procurement@globaltech.com',
          company:       'Global Tech Solutions Pvt. Ltd.',
          source:        'REFERRAL',
          notes:         'Interested in bulk hardware purchase. Follow up after demo.',
          status:        'NEW',
          assigned_to:   sarah.id,
        },
        {
          id: 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
          customer_name: 'Priya Sharma',
          phone:         '+91 91234 56789',
          email:         'priya.sharma@localstartup.in',
          company:       'Local Startup Inc',
          source:        'ONLINE',
          notes:         'Reached out via website. Interested in ERP integration.',
          status:        'NEW',
          assigned_to:   sarah.id,
        },
        {
          id: 'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2',
          customer_name: 'Rajan Mehta',
          phone:         '+91 99887 76655',
          email:         'rajan.mehta@freelance.com',
          company:       null,
          source:        'WALK_IN',
          notes:         'Independent consultant. Wants trial account.',
          status:        'NEW',
          assigned_to:   sarah.id,
        },
        {
          id: 'b1b2b3b4-1111-1111-1111-111111111101',
          customer_name: 'Anjali Nair',
          phone:         '+91 87654 32109',
          email:         'anjali.nair@brightfuture.in',
          company:       'Bright Future Enterprises',
          source:        'COLD_CALL',
          notes:         'Responded positively to initial call. Wants pricing for 10 laptops.',
          status:        'NEW',
          assigned_to:   sarah.id,
        },
        {
          id: 'b1b2b3b4-1111-1111-1111-111111111102',
          customer_name: 'Kiran Desai',
          phone:         '+91 76543 21098',
          email:         'kiran@desaiconsulting.com',
          company:       'Desai Consulting Group',
          source:        'REFERRAL',
          notes:         'Referred by Amit Joshi. Needs networking equipment.',
          status:        'NEW',
          assigned_to:   sarah.id,
        },
        {
          id: 'b1b2b3b4-1111-1111-1111-111111111103',
          customer_name: 'Nisha Pillai',
          phone:         '+91 65432 10987',
          email:         'nisha.pillai@greenedge.io',
          company:       'GreenEdge Technologies',
          source:        'ONLINE',
          notes:         null,
          status:        'NEW',
          assigned_to:   sarah.id,
        },
        {
          id: 'b1b2b3b4-1111-1111-1111-111111111104',
          customer_name: 'Suresh Babu',
          phone:         '+91 54321 09876',
          email:         'suresh@sbabu-it.com',
          company:       'S. Babu IT Services',
          source:        'OTHER',
          notes:         'Wants to upgrade 20 workstations. Budget is flexible.',
          status:        'NEW',
          assigned_to:   sarah.id,
        },

        // ── Assigned to Sarah — CONVERTED ────────────────────────────────
        {
          id: 'd3d3d3d3-d3d3-d3d3-d3d3-d3d3d3d3d3d3',
          customer_name: 'Sunrise Retailers',
          phone:         '+91 80000 11111',
          email:         'orders@sunriseretail.com',
          company:       'Sunrise Retailers Pvt. Ltd.',
          source:        'COLD_CALL',
          notes:         'Converted after 2 follow-up calls. High-value order placed.',
          status:        'CONVERTED',
          assigned_to:   sarah.id,
        },
        {
          id: 'e4e4e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4',
          customer_name: 'Amit Joshi',
          phone:         '+91 77543 21098',
          email:         'amit@techbridge.io',
          company:       'TechBridge Solutions',
          source:        'REFERRAL',
          notes:         'Referred by Global Tech. Quick conversion for accessories bundle.',
          status:        'CONVERTED',
          assigned_to:   sarah.id,
        },
        {
          id: 'b1b2b3b4-2222-2222-2222-222222222201',
          customer_name: 'Meghna Tiwari',
          phone:         '+91 83333 44444',
          email:         'meghna@tiwaricorp.in',
          company:       'Tiwari Corporation',
          source:        'ONLINE',
          notes:         'Placed order for 5 monitors and docking stations.',
          status:        'CONVERTED',
          assigned_to:   sarah.id,
        },
        {
          id: 'b1b2b3b4-2222-2222-2222-222222222202',
          customer_name: 'Harish Reddy',
          phone:         '+91 92222 33333',
          email:         'harish@reddyinfra.com',
          company:       'Reddy Infrastructure',
          source:        'WALK_IN',
          notes:         'Purchased bulk USB-C cables and chargers for office setup.',
          status:        'CONVERTED',
          assigned_to:   sarah.id,
        },
        {
          id: 'b1b2b3b4-2222-2222-2222-222222222203',
          customer_name: 'Tanvi Kapoor',
          phone:         '+91 70070 80080',
          email:         'tanvi.kapoor@kapoorgroups.com',
          company:       'Kapoor Business Groups',
          source:        'COLD_CALL',
          notes:         'Large order — 15 laptops + peripherals. Converted on first quote.',
          status:        'CONVERTED',
          assigned_to:   sarah.id,
        },

        // ── Unassigned — NEW (admin queue) ───────────────────────────────
        {
          id: 'f5f5f5f5-f5f5-f5f5-f5f5-f5f5f5f5f5f5',
          customer_name: 'Meena Textiles',
          phone:         '+91 84321 09876',
          email:         'contact@meenatextiles.in',
          company:       'Meena Textiles Ltd.',
          source:        'ONLINE',
          notes:         'Submitted inquiry form. Needs to be assigned.',
          status:        'NEW',
          assigned_to:   null,
        },
        {
          id: 'a7b8c9d0-1234-5678-abcd-ef0123456789',
          customer_name: 'Farhan Qureshi',
          phone:         '+91 70011 22334',
          email:         'farhan.q@enterprise.net',
          company:       'Enterprise Net Solutions',
          source:        'OTHER',
          notes:         null,
          status:        'NEW',
          assigned_to:   null,
        },
        {
          id: 'b1b2b3b4-3333-3333-3333-333333333301',
          customer_name: 'Divya Menon',
          phone:         '+91 95555 66677',
          email:         'divya@menontech.in',
          company:       'Menon Tech Solutions',
          source:        'REFERRAL',
          notes:         'Referred by Kiran Desai. Wants 3 gaming laptops.',
          status:        'NEW',
          assigned_to:   null,
        },
        {
          id: 'b1b2b3b4-3333-3333-3333-333333333302',
          customer_name: 'Sameer Khan',
          phone:         '+91 88811 99900',
          email:         'sameer.khan@cloudworks.io',
          company:       'CloudWorks India',
          source:        'COLD_CALL',
          notes:         'Cold call lead. Interested in networking switch and routers.',
          status:        'NEW',
          assigned_to:   null,
        },
        {
          id: 'b1b2b3b4-3333-3333-3333-333333333303',
          customer_name: 'Pooja Verma',
          phone:         '+91 77700 12345',
          email:         'pooja@vermanetworks.com',
          company:       null,
          source:        'WALK_IN',
          notes:         'Walk-in. Asked about SSD upgrade options for existing laptops.',
          status:        'NEW',
          assigned_to:   null,
        },
        {
          id: 'b1b2b3b4-3333-3333-3333-333333333304',
          customer_name: 'Rajiv Pillai',
          phone:         '+91 60012 34567',
          email:         'rajiv.pillai@pillaicorp.in',
          company:       'Pillai Corporate Services',
          source:        'ONLINE',
          notes:         null,
          status:        'NEW',
          assigned_to:   null,
        },

      ]);

      // Sarah has 12 leads assigned (7 NEW + 5 CONVERTED)
      await User.update({ leads_count: 12 }, { where: { id: sarah.id } });

      console.log('✅ Leads seeded successfully (19 leads).');
    } else {
      console.log('ℹ️ Leads already exist, skipping seeding.');
    }
  } catch (error) {
    console.error('❌ Error seeding leads:', error);
  }
};

export default seedLeads;
