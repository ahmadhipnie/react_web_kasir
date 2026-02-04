const { FoodModel } = require('../models');
const path = require('path');
const fs = require('fs');

exports.getAll = async (req, res) => {
  try {
    const { category_id, search, status } = req.query;
    
    const foods = await FoodModel.findAll({ category_id, search, status });

    res.json({
      success: true,
      data: foods
    });
  } catch (error) {
    console.error('Get foods error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching foods'
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const food = await FoodModel.findById(id);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food not found'
      });
    }

    res.json({
      success: true,
      data: food
    });
  } catch (error) {
    console.error('Get food error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching food'
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { food_name, category_id, price, stock, description, status } = req.body;
    const image = req.file ? req.file.filename : null;

    // Validate required fields
    if (!food_name || !category_id || !price) {
      return res.status(400).json({
        success: false,
        message: 'Food name, category, and price are required'
      });
    }

    // Generate food_code using model
    const food_code = await FoodModel.generateFoodCode();

    // Status validation
    const validStatuses = ['available', 'out_of_stock', 'inactive'];
    const finalStatus = validStatuses.includes(status) ? status : 'available';

    const newFood = await FoodModel.create({
      food_code,
      food_name,
      category_id,
      price,
      stock: stock || 0,
      description,
      image,
      status: finalStatus
    });

    // Fetch the complete food data with category
    const foodData = await FoodModel.findById(newFood.id);

    res.status(201).json({
      success: true,
      message: 'Food created successfully',
      data: foodData
    });
  } catch (error) {
    console.error('Create food error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating food'
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { food_name, category_id, price, stock, description, status } = req.body;

    // Check if food exists
    const existing = await FoodModel.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Food not found'
      });
    }

    // Validate required fields
    if (!food_name || !category_id || !price) {
      return res.status(400).json({
        success: false,
        message: 'Food name, category, and price are required'
      });
    }

    let image = existing.image;

    // Handle image upload
    if (req.file) {
      // Delete old image if exists
      if (image) {
        const oldPath = path.join(__dirname, '../../uploads', image);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      image = req.file.filename;
    }

    // Status validation
    const validStatuses = ['available', 'out_of_stock', 'inactive'];
    const finalStatus = validStatuses.includes(status) ? status : existing.status;

    await FoodModel.update(id, {
      food_name,
      category_id,
      price,
      stock: stock || 0,
      description,
      image,
      status: finalStatus
    });

    // Fetch updated food data
    const updated = await FoodModel.findById(id);

    res.json({
      success: true,
      message: 'Food updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Update food error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating food'
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    console.log(`Delete food request: id=${id}, force=${force}`);

    // Check if food exists
    const existing = await FoodModel.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Food not found'
      });
    }

    // Check if food is used in transactions
    const hasTransactions = await FoodModel.hasTransactions(id);
    console.log(`Food ${id} hasTransactions: ${hasTransactions}`);

    if (hasTransactions && force !== 'true') {
      // Get transaction count for warning message
      const transactionCount = await FoodModel.getTransactionCount(id);
      
      return res.status(409).json({
        success: false,
        message: 'This food has been used in transactions. Deleting it will also remove all related transaction details.',
        requiresConfirmation: true,
        data: {
          transaction_count: transactionCount
        }
      });
    }

    // Delete image if exists
    if (existing.image) {
      const imagePath = path.join(__dirname, '../../uploads', existing.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    let deleted;
    if (hasTransactions && force === 'true') {
      // Use cascade delete method
      deleted = await FoodModel.deleteWithReferences(id);
      console.log(`Food ${id} deleted with references: ${deleted}`);
    } else {
      // Normal delete (no references)
      deleted = await FoodModel.delete(id);
      console.log(`Food ${id} deleted: ${deleted}`);
    }

    res.json({
      success: true,
      message: hasTransactions 
        ? 'Food and all related transaction details deleted successfully'
        : 'Food deleted successfully'
    });
  } catch (error) {
    console.error('Delete food error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while deleting food'
    });
  }
};
