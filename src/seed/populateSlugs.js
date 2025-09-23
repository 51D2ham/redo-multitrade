require('dotenv').config();
const mongoose = require('mongoose');
const { Category, SubCategory, Type, Brand } = require('../models/parametersModel');

// Generate slug from name
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
};

// Connect to database
const connectDb = async () => {
  try {
    await mongoose.connect(process.env.CONNECTION_STRING);
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Populate slugs for categories
const populateCategorySlugs = async () => {
  try {
    const categories = await Category.find({ $or: [{ slug: { $exists: false } }, { slug: '' }, { slug: null }] });
    console.log(`📂 Found ${categories.length} categories without slugs`);
    
    let updated = 0;
    for (const category of categories) {
      const slug = generateSlug(category.name);
      
      // Check for duplicate slugs
      const existingSlug = await Category.findOne({ slug, _id: { $ne: category._id } });
      const finalSlug = existingSlug ? `${slug}-${category._id.toString().slice(-4)}` : slug;
      
      await Category.findByIdAndUpdate(category._id, { slug: finalSlug });
      console.log(`  ✅ Updated category: "${category.name}" → "${finalSlug}"`);
      updated++;
    }
    
    console.log(`✅ Updated ${updated} category slugs`);
  } catch (error) {
    console.error('❌ Error updating category slugs:', error.message);
  }
};

// Populate slugs for subcategories
const populateSubCategorySlugs = async () => {
  try {
    const subCategories = await SubCategory.find({ $or: [{ slug: { $exists: false } }, { slug: '' }, { slug: null }] });
    console.log(`📂 Found ${subCategories.length} subcategories without slugs`);
    
    let updated = 0;
    for (const subCategory of subCategories) {
      const slug = generateSlug(subCategory.name);
      
      // Check for duplicate slugs
      const existingSlug = await SubCategory.findOne({ slug, _id: { $ne: subCategory._id } });
      const finalSlug = existingSlug ? `${slug}-${subCategory._id.toString().slice(-4)}` : slug;
      
      await SubCategory.findByIdAndUpdate(subCategory._id, { slug: finalSlug });
      console.log(`  ✅ Updated subcategory: "${subCategory.name}" → "${finalSlug}"`);
      updated++;
    }
    
    console.log(`✅ Updated ${updated} subcategory slugs`);
  } catch (error) {
    console.error('❌ Error updating subcategory slugs:', error.message);
  }
};

// Populate slugs for types
const populateTypeSlugs = async () => {
  try {
    const types = await Type.find({ $or: [{ slug: { $exists: false } }, { slug: '' }, { slug: null }] });
    console.log(`📂 Found ${types.length} types without slugs`);
    
    let updated = 0;
    for (const type of types) {
      const slug = generateSlug(type.name);
      
      // Check for duplicate slugs
      const existingSlug = await Type.findOne({ slug, _id: { $ne: type._id } });
      const finalSlug = existingSlug ? `${slug}-${type._id.toString().slice(-4)}` : slug;
      
      await Type.findByIdAndUpdate(type._id, { slug: finalSlug });
      console.log(`  ✅ Updated type: "${type.name}" → "${finalSlug}"`);
      updated++;
    }
    
    console.log(`✅ Updated ${updated} type slugs`);
  } catch (error) {
    console.error('❌ Error updating type slugs:', error.message);
  }
};

// Populate slugs for brands
const populateBrandSlugs = async () => {
  try {
    const brands = await Brand.find({ $or: [{ slug: { $exists: false } }, { slug: '' }, { slug: null }] });
    console.log(`📂 Found ${brands.length} brands without slugs`);
    
    let updated = 0;
    for (const brand of brands) {
      const slug = generateSlug(brand.name);
      
      // Check for duplicate slugs
      const existingSlug = await Brand.findOne({ slug, _id: { $ne: brand._id } });
      const finalSlug = existingSlug ? `${slug}-${brand._id.toString().slice(-4)}` : slug;
      
      await Brand.findByIdAndUpdate(brand._id, { slug: finalSlug });
      console.log(`  ✅ Updated brand: "${brand.name}" → "${finalSlug}"`);
      updated++;
    }
    
    console.log(`✅ Updated ${updated} brand slugs`);
  } catch (error) {
    console.error('❌ Error updating brand slugs:', error.message);
  }
};

// Main function
const populateAllSlugs = async () => {
  console.log('🚀 Starting slug population script...\n');
  
  await connectDb();
  
  console.log('📊 Populating slugs for all entities...\n');
  
  await populateCategorySlugs();
  console.log('');
  
  await populateSubCategorySlugs();
  console.log('');
  
  await populateTypeSlugs();
  console.log('');
  
  await populateBrandSlugs();
  console.log('');
  
  console.log('🎉 Slug population completed successfully!');
  
  // Close database connection
  await mongoose.connection.close();
  console.log('✅ Database connection closed');
  process.exit(0);
};

// Run the script
if (require.main === module) {
  populateAllSlugs().catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { populateAllSlugs, generateSlug };