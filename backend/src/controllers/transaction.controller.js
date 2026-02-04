const { TransactionModel } = require('../models');

exports.create = async (req, res) => {
  try {
    const {
      items,
      money_received,
      payment_method = 'cash',
      subtotal: clientSubtotal,
      tax: clientTax,
      discount: clientDiscount,
      total_payment: clientTotalPayment,
      change_money: clientChangeMoney,
      total_item: clientTotalItem,
      notes
    } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Transaction items are required'
      });
    }

    // Validate cash payment
    if (payment_method === 'cash' && (money_received === undefined || money_received === null)) {
      return res.status(400).json({
        success: false,
        message: 'Money received is required for cash payment'
      });
    }

    const userId = req.user?.id || req.body.user_id || null;

    // Calculate totals
    let total_item = 0;
    let subtotal = 0;
    for (const item of items) {
      const quantity = parseInt(item.quantity || item.qty || 0);
      const price = parseFloat(item.price || item.unit_price || 0);
      total_item += quantity;
      subtotal += price * quantity;
    }

    // Use client values if provided
    if (clientSubtotal !== undefined) subtotal = Number(clientSubtotal);
    const tax = clientTax !== undefined ? Number(clientTax) : 0;
    const discount = clientDiscount !== undefined ? Number(clientDiscount) : 0;
    const total_payment = clientTotalPayment !== undefined ? Number(clientTotalPayment) : subtotal + tax - discount;
    const money_received_final = money_received !== undefined ? Number(money_received) : total_payment;
    const change_money = clientChangeMoney !== undefined ? Number(clientChangeMoney) : (money_received_final - total_payment);

    // Validate payment amount
    if (payment_method === 'cash' && change_money < 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment is less than total'
      });
    }

    // Generate transaction code using model
    const transaction_code = await TransactionModel.generateTransactionCode();

    // Prepare items for model
    const transactionItems = items.map(item => ({
      food_id: item.food_id,
      food_name: item.food_name || item.name || '',
      unit_price: parseFloat(item.price || item.unit_price || 0),
      quantity: parseInt(item.quantity || item.qty || 0),
      subtotal: (parseFloat(item.price || item.unit_price || 0) * parseInt(item.quantity || item.qty || 0)),
      notes: item.notes || null
    }));

    // Create transaction using model
    const result = await TransactionModel.create({
      transaction_code,
      user_id: userId,
      total_item,
      subtotal,
      tax,
      discount,
      total_payment,
      money_received: money_received_final,
      change_money,
      payment_method,
      notes,
      items: transactionItems
    });

    res.status(201).json({
      success: true,
      message: 'Transaction successful',
      data: result
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating transaction'
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { start_date, end_date, search, payment_method, page, limit } = req.query;
    
    const result = await TransactionModel.findAll({
      start_date,
      end_date,
      search,
      payment_method,
      page: page || 1,
      limit: limit || 10
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching transactions'
    });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { start_date, end_date, search, payment_method, limit } = req.query;
    
    const result = await TransactionModel.findAll({
      start_date,
      end_date,
      search,
      payment_method,
      page: 1,
      limit: limit || 1000
    });

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching transaction history'
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await TransactionModel.findById(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching transaction'
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await TransactionModel.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Note: Delete is not implemented in TransactionModel for data integrity
    // Transactions should generally not be deleted in production
    res.status(400).json({
      success: false,
      message: 'Transaction deletion is not allowed for data integrity'
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting transaction'
    });
  }
};
