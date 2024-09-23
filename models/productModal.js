const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  images: [{ type: String, required: true }],  // Array of image URLs
  stock: { type: Number, required: true },
  description: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  isDelete:{type:Boolean,default:false}
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
