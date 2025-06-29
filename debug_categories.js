// Debug script to check categories in the database
const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables or replace with actual values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCategories() {
  console.log('=== CHECKING CATEGORIES IN DATABASE ===');
  
  // Get all categories
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name');
    
  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError);
    return;
  }
  
  console.log('Available categories:', categories);
  console.log('Total categories:', categories?.length || 0);
  
  // Check word counts per category
  for (const category of categories || []) {
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('word')
      .eq('category_id', category.id);
      
    if (wordsError) {
      console.error(`Error fetching words for ${category.name}:`, wordsError);
    } else {
      console.log(`${category.name}: ${words?.length || 0} words`);
    }
  }
  
  console.log('=== END CATEGORY CHECK ===');
}

checkCategories().catch(console.error);
