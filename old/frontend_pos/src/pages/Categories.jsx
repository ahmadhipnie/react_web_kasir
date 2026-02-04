import { useState, useEffect } from 'react';
import { 
  HiOutlinePlus, 
  HiOutlineSearch, 
  HiOutlinePencil, 
  HiOutlineTrash 
} from 'react-icons/hi';
import { IoGridOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { categoryService, foodService } from '../services/api';
import { Modal, ConfirmDialog, LoadingSpinner, EmptyState } from '../components/common';

// Icon options removed - categories will use default icon
const DEFAULT_CATEGORY_ICON = '🍔';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nama_kategori: '',
    deskripsi: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryService.getAll();
      
      if (response.success) {
        // Get food counts for each category
        const foodsRes = await foodService.getAll();
        const foods = foodsRes.data?.data || foodsRes.data || [];
        
        const categoriesWithCount = (response.data || []).map(cat => ({
          ...cat,
          food_count: foods.filter(f => f.category_id === cat.id).length
        }));
        
        setCategories(categoriesWithCount);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load category data');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat =>
    (cat.nama || cat.nama_kategori || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.deskripsi?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreateModal = () => {
    setSelectedCategory(null);
    setFormData({
      nama_kategori: '',
      deskripsi: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (category) => {
    setSelectedCategory(category);
    setFormData({
      nama_kategori: category.nama_kategori || '',
      deskripsi: category.deskripsi || ''
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (category) => {
    setSelectedCategory(category);
    setIsDeleteOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nama_kategori.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      setFormLoading(true);
      
      let response;
      if (selectedCategory) {
        response = await categoryService.update(selectedCategory.id, formData);
      } else {
        response = await categoryService.create(formData);
      }

      if (response.success) {
        toast.success(selectedCategory ? 'Category updated successfully' : 'Category added successfully');
        setIsModalOpen(false);
        fetchCategories();
      } else {
        toast.error(response.message || 'An error occurred');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error.response?.data?.message || 'Failed to save data');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setFormLoading(true);
      const response = await categoryService.delete(selectedCategory.id);
      
      if (response.success) {
        toast.success('Category deleted successfully');
        setIsDeleteOpen(false);
        fetchCategories();
      } else {
        toast.error(response.message || 'Failed to delete data');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete data');
    } finally {
      setFormLoading(false);
    }
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
              placeholder="Search category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <HiOutlineSearch className="search-icon" />
          </div>
        </div>

        <button className="btn btn-primary" onClick={openCreateModal}>
          <HiOutlinePlus />
          Add Category
        </button>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <LoadingSpinner message="Loading category data..." />
      ) : filteredCategories.length > 0 ? (
        <div className="categories-grid">
          {filteredCategories.map((category) => (
            <div key={category.id} className="category-card">
              <div className="category-icon">
                {DEFAULT_CATEGORY_ICON}
              </div>
              
              <div className="category-info">
                <h3>{category.nama_kategori}</h3>
                <p>{category.deskripsi || 'No description'}</p>
                <span className="category-count">
                  {category.food_count || 0} items
                </span>
              </div>

              <div className="category-actions">
                <button 
                  className="btn btn-icon btn-secondary sm"
                  onClick={() => openEditModal(category)}
                  title="Edit"
                >
                  <HiOutlinePencil />
                </button>
                <button 
                  className="btn btn-icon btn-secondary sm"
                  onClick={() => openDeleteModal(category)}
                  title="Delete"
                  style={{ color: 'var(--danger-500)' }}
                >
                  <HiOutlineTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={IoGridOutline}
          title="No categories yet"
          description="Add your first category to organize your menu"
          action={
            <button className="btn btn-primary" onClick={openCreateModal}>
              <HiOutlinePlus /> Add Category
            </button>
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCategory ? 'Edit Category' : 'Add New Category'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Category Name *</label>
            <input
              type="text"
              className="form-input"
              name="nama_kategori"
              value={formData.nama_kategori}
              onChange={handleInputChange}
              placeholder="Enter category name"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              name="deskripsi"
              value={formData.deskripsi}
              onChange={handleInputChange}
              placeholder="Enter category description"
              rows={3}
            />
          </div>

          {/* Status and Icon removed */}

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
              {formLoading ? 'Saving...' : selectedCategory ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Are you sure you want to delete category "${selectedCategory?.nama_kategori}"? All foods in this category will become uncategorized.`}
        confirmText="Yes, Delete"
        type="danger"
        loading={formLoading}
      />
    </div>
  );
};

export default Categories;
