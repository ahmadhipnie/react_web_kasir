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
  const [deleteWarning, setDeleteWarning] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    food_name: '',
    category_id: '',
    description: '',
    price: '',
    stock: '',
    image: null,
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
        setFoods(data);
        setTotalItems(data.length);
        setTotalPages(Math.ceil(data.length / itemsPerPage));
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
      food_name: '',
      category_id: '',
      description: '',
      price: '',
      stock: '',
      image: null,
      status: 'available'
    });
    setPreviewImage(null);
    setIsModalOpen(true);
  };

  const openEditModal = async (food) => {
    try {
      const response = await foodService.getById(food.id);
      if (response && response.success) {
        const f = response.data;
        setSelectedFood(f);
        setFormData({
          food_code: f.food_code || '',
          food_name: f.food_name || '',
          category_id: f.category_id || '',
          description: f.description || '',
          price: f.price || '',
          stock: f.stock || '',
          image: null,
          status: f.status || 'available'
        });
        setPreviewImage(f.image ? `http://localhost:8000/storage/${f.image}` : null);
        setIsModalOpen(true);
        return;
      }
    } catch (err) {
      console.error('Failed to fetch food details:', err);
    }

    // Fallback if getById fails
    setSelectedFood(food);
    setFormData({
      food_code: food.food_code || '',
      food_name: food.food_name || '',
      category_id: food.category_id || '',
      description: food.description || '',
      price: food.price || '',
      stock: food.stock || '',
      image: null,
      status: food.status || 'available'
    });
    setPreviewImage(food.image ? `http://localhost:8000/storage/${food.image}` : null);
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
      setFormData(prev => ({ ...prev, image: file }));
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
    setPreviewImage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.food_name.trim()) {
      toast.error('Food name is required');
      return;
    }

    if (!formData.category_id) {
      toast.error('Category must be selected');
      return;
    }

    if (!formData.price || formData.price <= 0) {
      toast.error('Price must be filled and greater than 0');
      return;
    }

    try {
      setFormLoading(true);
      
      const submitData = new FormData();
      submitData.append('food_name', formData.food_name);
      submitData.append('category_id', formData.category_id);
      submitData.append('description', formData.description);
      submitData.append('price', formData.price);
      submitData.append('stock', formData.stock || 0);
      submitData.append('status', formData.status);
      
      if (formData.image) {
        submitData.append('image', formData.image);
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
      
      if (!deleteWarning) {
        try {
          const response = await foodService.delete(selectedFood.id, false);
          
          if (response.success) {
            toast.success('Food deleted successfully');
            setIsDeleteOpen(false);
            setDeleteWarning(null);
            fetchFoods();
            return;
          }
        } catch (error) {
          if (error.response?.status === 409 && error.response?.data?.requiresConfirmation) {
            const warningData = error.response.data.data;
            setDeleteWarning(warningData);
            setFormLoading(false);
            return;
          }
          throw error;
        }
      }
      
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
    return category?.category_name || 'Uncategorized';
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'available': { class: 'badge-success', label: 'Available', icon: IoCheckmarkCircleOutline },
      'out_of_stock': { class: 'badge-danger', label: 'Out of Stock', icon: IoCloseCircleOutline },
      'inactive': { class: 'badge-warning', label: 'Inactive', icon: IoAlertCircleOutline }
    };
    const statusInfo = statusMap[status] || { class: 'badge-info', label: status, icon: IoAlertCircleOutline };
    const Icon = statusInfo.icon;
    return (
      <span className={`badge ${statusInfo.class}`}>
        <Icon className="badge-icon" />
        {statusInfo.label}
      </span>
    );
  };

  // Paginate foods
  const paginatedFoods = foods.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

          <div className="filter-tabs">
            <button
              className={`filter-tab ${selectedStatus === 'all' ? 'active' : ''}`}
              onClick={() => handleStatusFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-tab ${selectedStatus === 'available' ? 'active' : ''}`}
              onClick={() => handleStatusFilter('available')}
            >
              Available
            </button>
            <button
              className={`filter-tab ${selectedStatus === 'out_of_stock' ? 'active' : ''}`}
              onClick={() => handleStatusFilter('out_of_stock')}
            >
              Out of Stock
            </button>
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
      ) : paginatedFoods.length > 0 ? (
        <>
          <div className="foods-grid">
            {paginatedFoods.map((food) => (
              <div key={food.id} className="food-card">
                <div className="food-card-image">
                  {food.image ? (
                    <img 
                      src={`http://localhost:8000/storage/${food.image}`} 
                      alt={food.food_name}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="placeholder" style={{ display: food.image ? 'none' : 'flex' }}>
                    <IoFastFoodOutline />
                  </div>
                  <div className="food-card-badge">
                    <span className="badge badge-info">{food.food_code}</span>
                  </div>
                  <div className="food-card-status">
                    {getStatusBadge(food.status)}
                  </div>
                </div>

                <div className="food-card-body">
                  <p className="food-card-category">{getCategoryName(food.category_id)}</p>
                  <h3 className="food-card-name">{food.food_name}</h3>
                  <p className="food-card-desc">{food.description || 'No description'}</p>
                  
                  <div className="food-card-footer">
                    <div>
                      <p className="food-card-price">{formatCurrency(food.price)}</p>
                      <p className={`food-card-stock ${food.stock < 10 ? 'low' : ''}`}>
                        Stock: {food.stock}
                      </p>
                    </div>
                    <div className="food-card-actions">
                      <button 
                        className="btn btn-icon btn-secondary sm"
                        onClick={() => openEditModal(food)}
                        title="Edit"
                      >
                        <HiOutlinePencil />
                      </button>
                      <button 
                        className="btn btn-icon btn-secondary sm"
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
          title="No foods yet"
          description="Add your first food item to the menu"
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
                name="food_name"
                value={formData.food_name}
                onChange={handleInputChange}
                placeholder="Enter food name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-select"
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                required
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Price (USD) *</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="Enter price"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Stock</label>
              <input
                type="number"
                className="form-input"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                placeholder="Enter stock"
                min="0"
              />
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

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              name="description"
              value={formData.description}
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
                  ×
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
                <p>Max 2MB (JPG, PNG, GIF)</p>
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
        title="Delete Food"
        message={
          deleteWarning 
            ? `This food has been used in ${deleteWarning.transaction_count} transaction(s). Are you sure you want to delete it? This cannot be undone.`
            : `Are you sure you want to delete "${selectedFood?.food_name}"?`
        }
        confirmText={deleteWarning ? "Yes, Delete Anyway" : "Yes, Delete"}
        type="danger"
        loading={formLoading}
      />
    </div>
  );
};

export default Foods;
