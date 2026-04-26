import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
  console.log('Seeding leads...');

  const { data: existingLeads } = await supabase.from('leads').select('id').limit(1);

  if (existingLeads && existingLeads.length > 0) {
    console.log('Data already exists, skipping seed.');
    return;
  }

  const leads = [
    { first_name: 'Ana', last_name: 'Oliveira', email: 'ana@tech.com', phone: '11999998888', status: 'new', source: 'WhatsApp', value: 2500 },
    { first_name: 'Carlos', last_name: 'Silva', email: 'carlos@auto.com', phone: '11988887777', status: 'new', source: 'Site', value: 1200 },
    { first_name: 'Juliana', last_name: 'Costa', email: 'ju@glow.com', phone: '11977776666', status: 'contacted', source: 'Instagram', value: 3800 },
    { first_name: 'Roberto', last_name: 'Santos', email: 'roberto@log.com', phone: '11966665555', status: 'qualified', source: 'Indicação', value: 15000 },
    { first_name: 'Fernanda', last_name: 'Lima', email: 'fer@consult.com', phone: '11955554444', status: 'proposal', source: 'Site', value: 5000 },
  ];

  const { error } = await supabase.from('leads').insert(leads);

  if (error) {
    console.error('Error seeding leads:', error);
  } else {
    console.log('Leads seeded successfully!');
  }
}

seed();
