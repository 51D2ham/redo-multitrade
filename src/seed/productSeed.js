require('dotenv').config();
const mongoose = require('mongoose');
const connectDb = require('../config/connectDb');
const { Category, SubCategory, Type, Brand } = require('../models/parametersModel');
const SpecList = require('../models/specListModel');
const { Product, ProductSpecs } = require('../models/productModel');
const Admin = require('../models/adminModel');

const seedData = async () => {
  try {
    await connectDb();
    console.log('🌱 Starting product ecosystem seed...');

    // Get admin user
    const admin = await Admin.findOne();
    if (!admin) {
      console.error('❌ No admin found. Please create an admin first.');
      return;
    }

    // Clear existing data
    await Promise.all([
      Category.deleteMany({}),
      SubCategory.deleteMany({}),
      Type.deleteMany({}),
      Brand.deleteMany({}),
      SpecList.deleteMany({}),
      Product.deleteMany({}),
      ProductSpecs.deleteMany({})
    ]);

    // 1. Categories
    const categories = await Category.insertMany([
      { name: 'Electronics', slug: 'electronics', admin: admin._id },
      { name: 'Home & Garden', slug: 'home-garden', admin: admin._id },
      { name: 'Fashion', slug: 'fashion', admin: admin._id }
    ]);

    // 2. SubCategories
    const subCategories = await SubCategory.insertMany([
      // Electronics
      { name: 'Mobile Phones', slug: 'mobile-phones', category: categories[0]._id, admin: admin._id },
      { name: 'Laptops', slug: 'laptops', category: categories[0]._id, admin: admin._id },
      { name: 'Audio', slug: 'audio', category: categories[0]._id, admin: admin._id },
      { name: 'Gaming', slug: 'gaming', category: categories[0]._id, admin: admin._id },
      // Home & Garden
      { name: 'Kitchen Appliances', slug: 'kitchen-appliances', category: categories[1]._id, admin: admin._id },
      { name: 'Furniture', slug: 'furniture', category: categories[1]._id, admin: admin._id },
      // Fashion
      { name: 'Clothing', slug: 'clothing', category: categories[2]._id, admin: admin._id },
      { name: 'Accessories', slug: 'accessories', category: categories[2]._id, admin: admin._id }
    ]);

    // 3. Types
    const types = await Type.insertMany([
      // Mobile Phones
      { name: 'Smartphones', slug: 'smartphones', subCategory: subCategories[0]._id, admin: admin._id },
      { name: 'Feature Phones', slug: 'feature-phones', subCategory: subCategories[0]._id, admin: admin._id },
      // Laptops
      { name: 'Gaming Laptops', slug: 'gaming-laptops', subCategory: subCategories[1]._id, admin: admin._id },
      { name: 'Business Laptops', slug: 'business-laptops', subCategory: subCategories[1]._id, admin: admin._id },
      { name: 'Ultrabooks', slug: 'ultrabooks', subCategory: subCategories[1]._id, admin: admin._id },
      // Audio
      { name: 'Headphones', slug: 'headphones', subCategory: subCategories[2]._id, admin: admin._id },
      { name: 'Speakers', slug: 'speakers', subCategory: subCategories[2]._id, admin: admin._id },
      { name: 'Earbuds', slug: 'earbuds', subCategory: subCategories[2]._id, admin: admin._id },
      // Gaming
      { name: 'Consoles', slug: 'consoles', subCategory: subCategories[3]._id, admin: admin._id },
      { name: 'Accessories', slug: 'gaming-accessories', subCategory: subCategories[3]._id, admin: admin._id }
    ]);

    // 4. Brands
    const brands = await Brand.insertMany([
      { name: 'Apple', slug: 'apple', admin: admin._id },
      { name: 'Samsung', slug: 'samsung', admin: admin._id },
      { name: 'Sony', slug: 'sony', admin: admin._id },
      { name: 'Dell', slug: 'dell', admin: admin._id },
      { name: 'HP', slug: 'hp', admin: admin._id },
      { name: 'Lenovo', slug: 'lenovo', admin: admin._id },
      { name: 'Bose', slug: 'bose', admin: admin._id },
      { name: 'JBL', slug: 'jbl', admin: admin._id },
      { name: 'Nintendo', slug: 'nintendo', admin: admin._id },
      { name: 'Microsoft', slug: 'microsoft', admin: admin._id }
    ]);

    // 5. Specification Lists
    const specLists = await SpecList.insertMany([
      // General Electronics
      { title: 'Screen Size', slug: 'screen-size', admin: admin._id },
      { title: 'Resolution', slug: 'resolution', admin: admin._id },
      { title: 'Processor', slug: 'processor', admin: admin._id },
      { title: 'RAM', slug: 'ram', admin: admin._id },
      { title: 'Storage', slug: 'storage', admin: admin._id },
      { title: 'Operating System', slug: 'operating-system', admin: admin._id },
      { title: 'Battery Life', slug: 'battery-life', admin: admin._id },
      { title: 'Weight', slug: 'weight', admin: admin._id },
      { title: 'Connectivity', slug: 'connectivity', admin: admin._id },
      { title: 'Color Options', slug: 'color-options', admin: admin._id },
      { title: 'Warranty', slug: 'warranty', admin: admin._id },
      { title: 'Camera', slug: 'camera', admin: admin._id },
      { title: 'Audio Features', slug: 'audio-features', admin: admin._id },
      { title: 'Graphics Card', slug: 'graphics-card', admin: admin._id },
      { title: 'Ports', slug: 'ports', admin: admin._id }
    ]);

    // 6. Sample Products
    const products = [];

    // iPhone 15 Pro
    const iphone15 = await Product.create({
      slug: 'iphone-15-pro-128gb',
      title: 'iPhone 15 Pro 128GB',
      description: 'The iPhone 15 Pro features a titanium design, A17 Pro chip, and advanced camera system with 3x telephoto zoom. Experience the power of pro photography and performance.',
      shortDescription: 'Premium smartphone with titanium design and A17 Pro chip',
      price: 999,
      category: categories[0]._id,
      subCategory: subCategories[0]._id,
      type: types[0]._id,
      brand: brands[0]._id,
      status: 'active',
      featured: true,
      warranty: '1 year Apple warranty',
      returnPolicy: '14 days return policy',
      shippingInfo: 'Free shipping on orders over $50',
      tags: ['smartphone', 'premium', '5G', 'iOS', 'camera'],
      variants: [
        {
          sku: 'IPH15P-128-NAT',
          color: 'Natural Titanium',
          price: 999,
          qty: 50,
          thresholdQty: 10,
          isDefault: true,
          shipping: true
        },
        {
          sku: 'IPH15P-128-BLU',
          color: 'Blue Titanium',
          price: 999,
          discountPrice: 899, // $100 discount
          oldPrice: 1099,     // Previous price
          qty: 45,
          thresholdQty: 10,
          shipping: true
        },
        {
          sku: 'IPH15P-128-WHT',
          color: 'White Titanium',
          price: 999,
          qty: 40,
          thresholdQty: 10,
          shipping: true
        }
      ],
      admin: admin._id
    });

    // Samsung Galaxy S24 Ultra
    const galaxyS24 = await Product.create({
      slug: 'samsung-galaxy-s24-ultra-256gb',
      title: 'Samsung Galaxy S24 Ultra 256GB',
      description: 'The Galaxy S24 Ultra delivers exceptional performance with Snapdragon 8 Gen 3, S Pen functionality, and advanced AI features. Perfect for productivity and creativity.',
      shortDescription: 'Flagship Android smartphone with S Pen and AI features',
      price: 1199,
      category: categories[0]._id,
      subCategory: subCategories[0]._id,
      type: types[0]._id,
      brand: brands[1]._id,
      status: 'active',
      featured: true,
      warranty: '1 year Samsung warranty',
      returnPolicy: '15 days return policy',
      shippingInfo: 'Free shipping on orders over $50',
      tags: ['smartphone', 'android', 'S Pen', 'AI', 'camera'],
      variants: [
        {
          sku: 'SGS24U-256-BLK',
          color: 'Titanium Black',
          price: 1199,
          qty: 35,
          thresholdQty: 8,
          isDefault: true,
          shipping: true
        },
        {
          sku: 'SGS24U-256-GRY',
          color: 'Titanium Gray',
          price: 1199,
          qty: 30,
          thresholdQty: 8,
          shipping: true
        }
      ],
      admin: admin._id
    });

    // MacBook Pro 14"
    const macbookPro = await Product.create({
      slug: 'macbook-pro-14-m3-pro',
      title: 'MacBook Pro 14" M3 Pro',
      description: 'The MacBook Pro 14" with M3 Pro chip delivers exceptional performance for professionals. Features Liquid Retina XDR display, advanced thermal design, and all-day battery life.',
      shortDescription: 'Professional laptop with M3 Pro chip and Liquid Retina XDR display',
      price: 1999,
      category: categories[0]._id,
      subCategory: subCategories[1]._id,
      type: types[2]._id,
      brand: brands[0]._id,
      status: 'active',
      featured: true,
      warranty: '1 year Apple warranty',
      returnPolicy: '14 days return policy',
      shippingInfo: 'Free shipping on orders over $50',
      tags: ['laptop', 'professional', 'M3 Pro', 'macOS', 'creative'],
      variants: [
        {
          sku: 'MBP14-M3P-512-SG',
          color: 'Space Gray',
          size: '512GB SSD',
          price: 1999,
          qty: 25,
          thresholdQty: 5,
          isDefault: true,
          shipping: true
        },
        {
          sku: 'MBP14-M3P-512-SV',
          color: 'Silver',
          size: '512GB SSD',
          price: 1999,
          qty: 20,
          thresholdQty: 5,
          shipping: true
        }
      ],
      admin: admin._id
    });

    // Sony WH-1000XM5
    const sonyHeadphones = await Product.create({
      slug: 'sony-wh-1000xm5-wireless-headphones',
      title: 'Sony WH-1000XM5 Wireless Headphones',
      description: 'Industry-leading noise canceling with the new Integrated Processor V1 and dual noise sensor technology. Up to 30-hour battery life with quick charge.',
      shortDescription: 'Premium wireless headphones with industry-leading noise canceling',
      price: 399,
      category: categories[0]._id,
      subCategory: subCategories[2]._id,
      type: types[5]._id,
      brand: brands[2]._id,
      status: 'active',
      featured: false,
      warranty: '1 year Sony warranty',
      returnPolicy: '30 days return policy',
      shippingInfo: 'Free shipping on orders over $50',
      tags: ['headphones', 'wireless', 'noise canceling', 'premium audio'],
      variants: [
        {
          sku: 'WH1000XM5-BLK',
          color: 'Black',
          price: 399,
          qty: 60,
          thresholdQty: 15,
          isDefault: true,
          shipping: true
        },
        {
          sku: 'WH1000XM5-SLV',
          color: 'Silver',
          price: 399,
          discountPrice: 349, // $50 discount
          qty: 45,
          thresholdQty: 15,
          shipping: true
        }
      ],
      admin: admin._id
    });

    products.push(iphone15, galaxyS24, macbookPro, sonyHeadphones);

    // 7. Product Specifications
    const productSpecs = [];

    // iPhone 15 Pro Specs
    productSpecs.push(
      { product: iphone15._id, specList: specLists[0]._id, value: '6.1 inch' },
      { product: iphone15._id, specList: specLists[1]._id, value: '2556 x 1179 pixels' },
      { product: iphone15._id, specList: specLists[2]._id, value: 'A17 Pro chip' },
      { product: iphone15._id, specList: specLists[4]._id, value: '128GB' },
      { product: iphone15._id, specList: specLists[5]._id, value: 'iOS 17' },
      { product: iphone15._id, specList: specLists[6]._id, value: 'Up to 23 hours video playback' },
      { product: iphone15._id, specList: specLists[7]._id, value: '187 grams' },
      { product: iphone15._id, specList: specLists[8]._id, value: '5G, Wi-Fi 6E, Bluetooth 5.3' },
      { product: iphone15._id, specList: specLists[11]._id, value: '48MP Main, 12MP Ultra Wide, 12MP Telephoto' }
    );

    // Galaxy S24 Ultra Specs
    productSpecs.push(
      { product: galaxyS24._id, specList: specLists[0]._id, value: '6.8 inch' },
      { product: galaxyS24._id, specList: specLists[1]._id, value: '3120 x 1440 pixels' },
      { product: galaxyS24._id, specList: specLists[2]._id, value: 'Snapdragon 8 Gen 3' },
      { product: galaxyS24._id, specList: specLists[3]._id, value: '12GB' },
      { product: galaxyS24._id, specList: specLists[4]._id, value: '256GB' },
      { product: galaxyS24._id, specList: specLists[5]._id, value: 'Android 14' },
      { product: galaxyS24._id, specList: specLists[6]._id, value: '5000mAh battery' },
      { product: galaxyS24._id, specList: specLists[7]._id, value: '232 grams' },
      { product: galaxyS24._id, specList: specLists[8]._id, value: '5G, Wi-Fi 7, Bluetooth 5.3' },
      { product: galaxyS24._id, specList: specLists[11]._id, value: '200MP Main, 50MP Periscope, 12MP Ultra Wide' }
    );

    // MacBook Pro Specs
    productSpecs.push(
      { product: macbookPro._id, specList: specLists[0]._id, value: '14.2 inch' },
      { product: macbookPro._id, specList: specLists[1]._id, value: '3024 x 1964 pixels' },
      { product: macbookPro._id, specList: specLists[2]._id, value: 'Apple M3 Pro' },
      { product: macbookPro._id, specList: specLists[3]._id, value: '18GB unified memory' },
      { product: macbookPro._id, specList: specLists[4]._id, value: '512GB SSD' },
      { product: macbookPro._id, specList: specLists[5]._id, value: 'macOS Sonoma' },
      { product: macbookPro._id, specList: specLists[6]._id, value: 'Up to 18 hours' },
      { product: macbookPro._id, specList: specLists[7]._id, value: '1.6 kg' },
      { product: macbookPro._id, specList: specLists[8]._id, value: 'Wi-Fi 6E, Bluetooth 5.3' },
      { product: macbookPro._id, specList: specLists[14]._id, value: '3x Thunderbolt 4, HDMI, SDXC, MagSafe 3' }
    );

    // Sony Headphones Specs
    productSpecs.push(
      { product: sonyHeadphones._id, specList: specLists[6]._id, value: 'Up to 30 hours' },
      { product: sonyHeadphones._id, specList: specLists[7]._id, value: '250 grams' },
      { product: sonyHeadphones._id, specList: specLists[8]._id, value: 'Bluetooth 5.2, NFC' },
      { product: sonyHeadphones._id, specList: specLists[12]._id, value: 'Industry-leading noise canceling, LDAC, Hi-Res Audio' }
    );

    await ProductSpecs.insertMany(productSpecs);

    console.log('✅ Product ecosystem seeded successfully!');
    console.log(`📊 Created:`);
    console.log(`   - ${categories.length} Categories`);
    console.log(`   - ${subCategories.length} SubCategories`);
    console.log(`   - ${types.length} Types`);
    console.log(`   - ${brands.length} Brands`);
    console.log(`   - ${specLists.length} Specification Lists`);
    console.log(`   - ${products.length} Products`);
    console.log(`   - ${productSpecs.length} Product Specifications`);

    console.log('\n🎯 Sample Products Created:');
    products.forEach(product => {
      console.log(`   - ${product.title} ($${product.price})`);
    });

  } catch (error) {
    console.error('❌ Seed error:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedData();