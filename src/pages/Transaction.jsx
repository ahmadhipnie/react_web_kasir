import { useState, useEffect } from 'react';
import { 
  HiOutlineSearch, 
  HiOutlineShoppingCart,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineMinus,
  HiOutlineCheck
} from 'react-icons/hi';
import { IoFastFoodOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { foodService, categoryService, transactionService } from '../services/api';
import { formatCurrency } from '../utils';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, Modal } from '../components/common';

const Transaction = () => {
  const { user } = useAuth();
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Cart state
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [note, setNote] = useState('');
  
  // Processing state
  const [processing, setProcessing] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [foodsRes, categoriesRes] = await Promise.all([
        foodService.getAll({ status: 'available' }),
        categoryService.getAll()
      ]);

      if (foodsRes.success) {
        setFoods(foodsRes.data?.data || foodsRes.data || []);
      }

      if (categoriesRes.success) {
        setCategories(categoriesRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Filter foods
  const filteredFoods = foods.filter(food => {
    const matchesSearch = food.nama_makanan.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || food.category_id === parseInt(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  // Cart functions
  const addToCart = (food) => {
    if (food.stok <= 0) {
      toast.error('Out of stock!');
      return;
    }

    const existingItem = cart.find(item => item.id === food.id);
    
    if (existingItem) {
      if (existingItem.quantity >= food.stok) {
        toast.error('Insufficient stock!');
        return;
      }
      setCart(cart.map(item =>
        item.id === food.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...food, quantity: 1 }]);
    }
    
    toast.success(`${food.nama_makanan} added to cart`);
  };

  const updateQuantity = (foodId, change) => {
    const food = foods.find(f => f.id === foodId);
    
    setCart(cart.map(item => {
      if (item.id === foodId) {
        const newQty = item.quantity + change;
        if (newQty < 1) return item;
        if (newQty > food.stok) {
          toast.error('Insufficient stock!');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (foodId) => {
    setCart(cart.filter(item => item.id !== foodId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCashReceived('');
    setNote('');
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.harga * item.quantity), 0);
  const discountAmount = (subtotal * discount) / 100;
  const tax = Math.round((subtotal - discountAmount) * 0.1); // 10% tax
  const total = subtotal - discountAmount + tax;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const change = cashReceived ? parseInt(cashReceived) - total : 0;

  // Process transaction
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty!');
      return;
    }

    if (paymentMethod === 'cash' && (!cashReceived || parseInt(cashReceived) < total)) {
      toast.error('Insufficient cash received!');
      return;
    }

    try {
      setProcessing(true);

      const transactionData = {
        user_id: user?.id,
        total_item: totalItems,
        subtotal: subtotal,
        pajak: tax,
        diskon: discountAmount,
        total_bayar: total,
        uang_diterima: paymentMethod === 'cash' ? parseInt(cashReceived) : total,
        uang_kembalian: paymentMethod === 'cash' ? change : 0,
        metode_pembayaran: paymentMethod,
        catatan: note,
        items: cart.map(item => ({
          food_id: item.id,
          nama_makanan: item.nama_makanan,
          harga_satuan: item.harga,
          jumlah: item.quantity,
          subtotal: item.harga * item.quantity,
          catatan: ''
        }))
      };

      const response = await transactionService.create(transactionData);

      if (response.success) {
        setLastTransaction(response.data);
        setSuccessModal(true);
        clearCart();
        fetchData(); // Refresh stock
      } else {
        toast.error(response.message || 'Failed to process transaction');
      }
    } catch (error) {
      console.error('Error processing transaction:', error);
      toast.error('Failed to process transaction');
    } finally {
      setProcessing(false);
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.nama_kategori || 'Uncategorized';
  };

  const DEFAULT_CATEGORY_ICON = '🍔';

  if (loading) {
    return <LoadingSpinner size="lg" message="Loading menu..." />;
  }

  return (
    <div className="transaction-page">
      {/* Menu Section */}
      <div className="menu-section">
        <div className="menu-header">
          <div className="search-input" style={{ flex: 1, maxWidth: '300px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <HiOutlineSearch className="search-icon" />
          </div>

          <div className="category-filter">
            <button
              className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`category-btn ${selectedCategory === cat.id.toString() ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id.toString())}
              >
                {DEFAULT_CATEGORY_ICON} {cat.nama_kategori}
              </button>
            ))}
          </div>
        </div>

        <div className="menu-grid">
          {filteredFoods.length > 0 ? (
            filteredFoods.map((food) => (
              <div 
                key={food.id} 
                className={`menu-item ${food.stok <= 0 ? 'out-of-stock' : ''} ${cart.find(i => i.id === food.id) ? 'selected' : ''}`}
                onClick={() => food.stok > 0 && addToCart(food)}
              >
                <div className="menu-item-image">
                  {food.gambar ? (
                    <img 
                      src={`http://localhost:8000/storage/${food.gambar}`} 
                      alt={food.nama_makanan}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="placeholder" style={{ display: food.gambar ? 'none' : 'flex' }}>
                    <IoFastFoodOutline />
                  </div>
                </div>
                <div className="menu-item-info">
                  <h4 className="menu-item-name">{food.nama_makanan}</h4>
                  <p className="menu-item-price">{formatCurrency(food.harga)}</p>
                  <p className="menu-item-stock">
                    {food.stok > 0 ? `Stock: ${food.stok}` : 'Out of Stock'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div style={{ 
              gridColumn: '1 / -1', 
              textAlign: 'center', 
              padding: '3rem',
              color: 'var(--gray-400)'
            }}>
              <IoFastFoodOutline style={{ fontSize: '3rem', marginBottom: '1rem' }} />
              <p>Menu not found</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="cart-section">
        <div className="cart-header">
          <h3>
            <HiOutlineShoppingCart />
            Cart
            {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
          </h3>
          {cart.length > 0 && (
            <button 
              className="btn btn-ghost btn-sm"
              onClick={clearCart}
              style={{ color: 'var(--danger-500)' }}
            >
              Clear All
            </button>
          )}
        </div>

        <div className="cart-items">
          {cart.length > 0 ? (
            cart.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-image">
                  {item.gambar ? (
                    <img 
                      src={`http://localhost:8000/storage/${item.gambar}`} 
                      alt={item.nama_makanan}
                    />
                  ) : (
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: 'var(--gray-200)'
                    }}>
                      <IoFastFoodOutline style={{ color: 'var(--gray-400)' }} />
                    </div>
                  )}
                </div>
                <div className="cart-item-info">
                  <h4 className="cart-item-name">{item.nama_makanan}</h4>
                  <p className="cart-item-price">{formatCurrency(item.harga)}</p>
                  <div className="cart-item-quantity">
                    <button 
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, -1)}
                      disabled={item.quantity <= 1}
                    >
                      <HiOutlineMinus />
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button 
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <HiOutlinePlus />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="cart-item-total">{formatCurrency(item.harga * item.quantity)}</p>
                  <button 
                    className="cart-item-remove"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <HiOutlineTrash />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="cart-empty">
              <HiOutlineShoppingCart />
              <p>Cart is empty</p>
              <p style={{ fontSize: '0.8125rem' }}>Click a menu to add</p>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <>
            <div className="cart-summary">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="summary-row discount">
                <span>Discount (%)</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Math.min(100, Math.max(0, e.target.value)))}
                  min="0"
                  max="100"
                />
              </div>
              {discount > 0 && (
                <div className="summary-row" style={{ color: 'var(--danger-500)' }}>
                  <span>Discount Amount</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Tax (10%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="cart-actions">
              <div className="payment-methods">
                {[
                  { key: 'cash', label: 'Cash' },
                  { key: 'debit', label: 'Debit' },
                  { key: 'credit', label: 'Credit' },
                  { key: 'qris', label: 'QRIS' }
                ].map((method) => (
                  <button
                    key={method.key}
                    className={`payment-method ${paymentMethod === method.key ? 'active' : ''}`}
                    onClick={() => setPaymentMethod(method.key)}
                  >
                    {method.label}
                  </button>
                ))}
              </div>

              {paymentMethod === 'cash' && (
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Cash received"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                  />
                  {cashReceived && parseInt(cashReceived) >= total && (
                    <p style={{ 
                      marginTop: '0.5rem', 
                      fontSize: '0.875rem',
                      color: 'var(--success-600)',
                      fontWeight: '600'
                    }}>
                      Change: {formatCurrency(change)}
                    </p>
                  )}
                </div>
              )}

              <button 
                className="btn btn-success btn-lg"
                style={{ width: '100%' }}
                onClick={handleCheckout}
                disabled={processing || cart.length === 0}
              >
                {processing ? 'Processing...' : (
                  <>
                    <HiOutlineCheck />
                    Pay {formatCurrency(total)}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={successModal}
        onClose={() => setSuccessModal(false)}
        title="Transaction Successful"
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'var(--success-100)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            fontSize: '2.5rem',
            color: 'var(--success-600)'
          }}>
            <HiOutlineCheck />
          </div>
          
          <h3 style={{ marginBottom: '0.5rem' }}>Payment Successful!</h3>
          <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem' }}>
            Transaction has been processed
          </p>

          {lastTransaction && (
            <div style={{
              background: 'var(--gray-50)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              textAlign: 'left',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--gray-500)' }}>Transaction Code</span>
                <strong>{lastTransaction.kode_transaksi}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--gray-500)' }}>Total Payment</span>
                <strong>{formatCurrency(lastTransaction.total_bayar)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--gray-500)' }}>Method</span>
                <strong style={{ textTransform: 'capitalize' }}>{lastTransaction.metode_pembayaran}</strong>
              </div>
            </div>
          )}

          <button 
            className="btn btn-primary"
            onClick={() => setSuccessModal(false)}
            style={{ width: '100%' }}
          >
            New Transaction
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Transaction;
