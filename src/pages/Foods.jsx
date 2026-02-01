import { useState, useEffect } from 'react';
import { 
  HiOutlinePlus, 
  HiOutlineSearch, 
  HiOutlinePencil, 
  HiOutlineTrash,
  HiOutlinePhotograph
} from 'react-icons/hi';
import { IoFastFoodOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline, IoAlertCircleOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { foodService, categoryService } from '../services/api';
import { formatCurrency } from '../utils';
import { Modal, ConfirmDialog, LoadingSpinner, EmptyState, Pagination } from '../components/common';

const Foods = () => {
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 12;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState(null); // Store transaction impact info

  // Form state
  const [formData, setFormData] = useState({
    nama_makanan: '',
    category_id: '',
    deskripsi: '',
    harga: '',
    stok: '',
    gambar: null,
    status: 'available'
  });
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchFoods();
  }, [currentPage, selectedCategory, selectedStatus, searchQuery]);

  const fetchCategories = async () => {
    try {
      const response = await categoryService.getAll();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchFoods = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        per_page: itemsPerPage,
        search: searchQuery,
      };
      
      if (selectedCategory !== 'all') {
        params.category_id = selectedCategory;
      }
      
      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }

      const response = await foodService.getAll(params);
      
      if (response.success) {
        const data = response.data;
        setFoods(data.data || data);
        setTotalPages(data.last_page || 1);
        setTotalItems(data.total || data.length);
      }
    } catch (error) {
      console.error('Error fetching foods:', error);
      toast.error('Failed to load food data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryFilter = (categoryId) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const openCreateModal = () => {
    setSelectedFood(null);
    setFormData({
      nama_makanan: '',
      category_id: '',
      deskripsi: '',
      harga: '',
      stok: '',
      gambar: null,
      status: 'available'
    });
    setPreviewImage(null);
    setIsModalOpen(true);
  };

  const openEditModal = async (food) => {
    try {
      // Fetch fresh data to ensure we have all fields including kode_makanan
      const response = await foodService.getById(food.id);
      if (response && response.success) {
        const f = response.data;
        setSelectedFood(f);
        setFormData({
          kode_makanan: f.kode_makanan || '',
          nama_makanan: f.nama_makanan || '',
          category_id: f.category_id || '',
          deskripsi: f.deskripsi || '',
          harga: f.harga || '',
          stok: f.stok || '',
          gambar: null,
          status: f.status || 'available'
        });
        setPreviewImage(f.gambar ? `http://localhost:8000/storage/${f.gambar}` : null);
        setIsModalOpen(true);
        return;
      }
    } catch (err) {
      console.error('Failed to fetch food details:', err);
    }

    // Fallback if getById fails
    setSelectedFood(food);
    setFormData({
      kode_makanan: food.kode_makanan || '',
      nama_makanan: food.nama_makanan || '',
      category_id: food.category_id || '',
      deskripsi: food.deskripsi || '',
      harga: food.harga || '',
      stok: food.stok || '',
      gambar: null,
      status: food.status || 'available'
    });
    setPreviewImage(food.gambar ? `http://localhost:8000/storage/${food.gambar}` : null);
    setIsModalOpen(true);
  };

  const openDeleteModal = (food) => {
    setSelectedFood(food);
    setDeleteWarning(null);
    setIsDeleteOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Maximum image size is 2MB');
        return;
      }
      setFormData(prev => ({ ...prev, gambar: file }));
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, gambar: null }));
    setPreviewImage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nama_makanan.trim()) {
      toast.error('Food name is required');
      return;
    }

    if (!formData.category_id) {
      toast.error('Category must be selected');
      return;
    }

    if (!formData.harga || formData.harga <= 0) {
      toast.error('Price must be filled and greater than 0');
      return;
    }

    try {
      setFormLoading(true);
      
      const submitData = new FormData();
      submitData.append('nama_makanan', formData.nama_makanan);
      submitData.append('category_id', formData.category_id);
      submitData.append('deskripsi', formData.deskripsi);
      submitData.append('harga', formData.harga);
      submitData.append('stok', formData.stok || 0);
      submitData.append('status', formData.status);
      
      if (formData.gambar) {
        submitData.append('gambar', formData.gambar);
      }

      let response;
      if (selectedFood) {
        response = await foodService.update(selectedFood.id, submitData);
      } else {
        response = await foodService.create(submitData);
      }

      if (response.success) {
        toast.success(selectedFood ? 'Food updated successfully' : 'Food added successfully');
        setIsModalOpen(false);
        fetchFoods();
      } else {
        toast.error(response.message || 'An error occurred');
      }
    } catch (error) {
      console.error('Error saving food:', error);
      toast.error(error.response?.data?.message || 'Failed to save data');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setFormLoading(true);
      
      // If no warning yet, check for impact first
      if (!deleteWarning) {
        try {
          // Try to delete without force to check if it has transactions
          const response = await foodService.delete(selectedFood.id, false);
          
          // If successful (no transactions), close and refresh
          if (response.success) {
            toast.success('Food deleted successfully');
            setIsDeleteOpen(false);
            setDeleteWarning(null);
            fetchFoods();
            return;
          }
        } catch (error) {
          // Check if it's a confirmation requirement (409 status)
          if (error.response?.status === 409 && error.response?.data?.requiresConfirmation) {
            const warningData = error.response.data.data;
            setDeleteWarning(warningData);
            setFormLoading(false);
            return; // Show warning, don't close dialog
          }
          // Other errors
          throw error;
        }
      }
      
      // If we have warning, this is the force delete
      const response = await foodService.delete(selectedFood.id, true);
      
      if (response.success) {
        toast.success(response.message || 'Food deleted successfully');
        setIsDeleteOpen(false);
        setDeleteWarning(null);
        fetchFoods();
      } else {
        toast.error(response.message || 'Failed to delete data');
      }
    } catch (error) {
      console.error('Error deleting food:', error);
      toast.error(error.response?.data?.message || 'Failed to delete data');
    } finally {
      setFormLoading(false);
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.nama_kategori || 'Uncategorized';
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-actions">
          <div className="search-input">
            <input
              type="text"
              className="form-input"
              placeholder="Search food..."
              value={searchQuery}
              onChange={handleSearch}
            />
            <HiOutlineSearch className="search-icon" />
          </div>
          
          <select 
            className="form-select" 
            style={{ width: 'auto' }}
            value={selectedCategory}
            onChange={(e) => handleCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nama_kategori}</option>
            ))}
          </select>

          <div className="status-filters">
            <button className={`filter-tab ${selectedStatus === 'all' ? 'active' : ''}`} onClick={() => handleStatusFilter('all')}>All</button>
            <button className={`filter-tab ${selectedStatus === 'available' ? 'active' : ''}`} onClick={() => handleStatusFilter('available')}>Available</button>
            <button className={`filter-tab ${selectedStatus === 'out_of_stock' ? 'active' : ''}`} onClick={() => handleStatusFilter('out_of_stock')}>Out of Stock</button>
            <button className={`filter-tab ${selectedStatus === 'inactive' ? 'active' : ''}`} onClick={() => handleStatusFilter('inactive')}>Inactive</button>
          </div>
        </div>

        <button className="btn btn-primary" onClick={openCreateModal}>
          <HiOutlinePlus />
          Add Food
        </button>
      </div>

      {/* Foods Grid */}
      {loading ? (
        <LoadingSpinner message="Loading food data..." />
      ) : foods.length > 0 ? (
        <>
          <div className="foods-grid">
            {foods.map((food) => (
              <div key={food.id} className="food-card">
                <div className="food-card-image">
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
                  <div className="food-card-status">
                    {(() => {
                      const map = {
                        available: { label: 'Available', icon: <IoCheckmarkCircleOutline />, cls: 'badge-success' },
                        out_of_stock: { label: 'Out of Stock', icon: <IoAlertCircleOutline />, cls: 'badge-warning' },
                        inactive: { label: 'Inactive', icon: <IoCloseCircleOutline />, cls: 'badge-danger' }
                      };
                      const s = map[food.status] || { label: (food.status || ''), icon: null, cls: '' };
                      return (
                        <span className={`badge ${s.cls}`}>
                          {s.icon && <span className="badge-icon">{s.icon}</span>}
                          <span className="badge-text">{s.label}</span>
                        </span>
                      );
                    })()}
                  </div>
                </div>
                
                <div className="food-card-body">
                  <span className="food-card-category">
                    {getCategoryName(food.category_id)}
                  </span>
                  <h3 className="food-card-name">{food.nama_makanan}</h3>
                  <p className="food-card-desc">
                    {food.deskripsi || 'No description'}
                  </p>
                  
                  <div className="food-card-footer">
                    <div>
                      <span className="food-card-price">
                        {formatCurrency(food.harga)}
                      </span>
                      <span className={`food-card-stock ${food.stok <= 10 ? 'low' : ''}`}>
                        Stok: {food.stok}
                      </span>
                    </div>
                    <div className="food-card-actions">
                      <button 
                        className="btn btn-icon btn-ghost sm"
                        onClick={() => openEditModal(food)}
                        title="Edit"
                      >
                        <HiOutlinePencil />
                      </button>
                      <button 
                        className="btn btn-icon btn-ghost sm"
                        onClick={() => openDeleteModal(food)}
                        title="Delete"
                        style={{ color: 'var(--danger-500)' }}
                      >
                        <HiOutlineTrash />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </>
      ) : (
        <EmptyState
          icon={IoFastFoodOutline}
          title="No food items yet"
          description="Add your first food menu item"
          action={
            <button className="btn btn-primary" onClick={openCreateModal}>
              <HiOutlinePlus /> Add Food
            </button>
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedFood ? 'Edit Food' : 'Add New Food'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Food Name *</label>
              <input
                type="text"
                className="form-input"
                name="nama_makanan"
                value={formData.nama_makanan}
                onChange={handleInputChange}
                placeholder="Enter food name"
                required
              />
            </div>

            {selectedFood ? (
              <div className="form-group">
                <label className="form-label">Food Code</label>
                <input
                  type="text"
                  className="form-input"
                  name="kode_makanan"
                  value={formData.kode_makanan || ''}
                  readOnly
                  disabled
                />
              </div>
            ) : null}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-select"
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nama_kategori}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
              >
                <option value="available">Available</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Price *</label>
              <input
                type="number"
                className="form-input"
                name="harga"
                value={formData.harga}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Stock</label>
              <input
                type="number"
                className="form-input"
                name="stok"
                value={formData.stok}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              name="deskripsi"
              value={formData.deskripsi}
              onChange={handleInputChange}
              placeholder="Enter food description"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Image</label>
            {previewImage ? (
              <div className="image-preview">
                <img src={previewImage} alt="Preview" />
                <button 
                  type="button" 
                  className="image-preview-remove"
                  onClick={removeImage}
                >
                  <HiOutlineTrash />
                </button>
              </div>
            ) : (
              <label className="image-upload">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                />
                <HiOutlinePhotograph className="image-upload-icon" />
                <p>Click to upload image</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  PNG, JPG, JPEG (Max 2MB)
                </p>
              </label>
            )}
          </div>

          <div className="modal-footer" style={{ padding: '1.25rem 0 0', borderTop: '1px solid var(--gray-100)', marginTop: '1rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={formLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={formLoading}
            >
              {formLoading ? 'Saving...' : selectedFood ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeleteWarning(null);
        }}
        onConfirm={handleDelete}
        title={deleteWarning ? "⚠️ Delete Food - Confirmation Required" : "Delete Food"}
        message={
          deleteWarning ? (
            <div>
              <p style={{ marginBottom: '1rem' }}>
                <strong>"{selectedFood?.nama_makanan}"</strong> has been used in transactions:
              </p>
              <div style={{ 
                background: 'var(--warning-50)', 
                border: '1px solid var(--warning-200)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  📊 <strong>{deleteWarning.transaction_count}</strong> transactions affected
                </p>
                <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  📝 <strong>{deleteWarning.detail_count}</strong> transaction details will be deleted
                </p>
                <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  📅 First used: {new Date(deleteWarning.first_transaction).toLocaleDateString()}
                </p>
                <p style={{ fontSize: '0.875rem' }}>
                  📅 Last used: {new Date(deleteWarning.last_transaction).toLocaleDateString()}
                </p>
              </div>
              <p style={{ color: 'var(--danger-600)', fontSize: '0.875rem', fontWeight: '600' }}>
                {deleteWarning.warning}
              </p>
              <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
                Are you sure you want to continue?
              </p>
            </div>
          ) : (
            `Are you sure you want to delete "${selectedFood?.nama_makanan}"? This action cannot be undone.`
          )
        }
        confirmText={deleteWarning ? "Yes, Delete Everything" : "Yes, Delete"}
        type="danger"
        loading={formLoading}
      />
    </div>
  );
};

export default Foods;
