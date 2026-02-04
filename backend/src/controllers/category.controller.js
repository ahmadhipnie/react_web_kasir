const { CategoryModel } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const categories = await CategoryModel.findAll();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching categories'
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await CategoryModel.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching category'
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { category_name, description } = req.body;

    // Validate input
    if (!category_name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    // Check if category name already exists
    const existingCategory = await CategoryModel.findByName(category_name);
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }

    const newCategory = await CategoryModel.create({ category_name, description });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: newCategory
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating category'
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, description } = req.body;

    // Validate input
    if (!category_name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    // Check if category exists
    const existing = await CategoryModel.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category name already exists (excluding current category)
    const duplicateName = await CategoryModel.findByName(category_name, id);
    if (duplicateName) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }

    await CategoryModel.update(id, { category_name, description });

    const updated = await CategoryModel.findById(id);

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating category'
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const existing = await CategoryModel.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has foods
    const hasFoods = await CategoryModel.hasFoods(id);
    if (hasFoods) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category. There are foods in this category.'
      });
    }

    await CategoryModel.delete(id);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting category'
    });
  }
};
