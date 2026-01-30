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

// Icon options for categories
const ICON_OPTIONS = [
  '🍔', '🍕', '🍜', '🍝', '🍣', '🍱', '🍛', '🥗', 
  '🥤', '☕', '🍵', '🧃', '🍦', '🍰', '🧁', '🍩',
  '🍪', '🥐', '🥪', '🌮', '🌯', '🥡', '🍿', '🥨'
];

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
    deskripsi: '',
    icon: '🍔',
    status: 'aktif'
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
      toast.error('Gagal memuat data kategori');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.nama_kategori.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.deskripsi?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreateModal = () => {
    setSelectedCategory(null);
    setFormData({
      nama_kategori: '',
      deskripsi: '',
      icon: '🍔',
      status: 'aktif'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (category) => {
    setSelectedCategory(category);
    setFormData({
      nama_kategori: category.nama_kategori || '',
      deskripsi: category.deskripsi || '',
      icon: category.icon || '🍔',
      status: category.status || 'aktif'
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
      toast.error('Nama kategori harus diisi');
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
        toast.success(selectedCategory ? 'Kategori berhasil diupdate' : 'Kategori berhasil ditambahkan');
        setIsModalOpen(false);
        fetchCategories();
      } else {
        toast.error(response.message || 'Terjadi kesalahan');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan data');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setFormLoading(true);
      const response = await categoryService.delete(selectedCategory.id);
      
      if (response.success) {
        toast.success('Kategori berhasil dihapus');
        setIsDeleteOpen(false);
        fetchCategories();
      } else {
        toast.error(response.message || 'Gagal menghapus data');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Gagal menghapus data');
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
              placeholder="Cari kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <HiOutlineSearch className="search-icon" />
          </div>
        </div>

        <button className="btn btn-primary" onClick={openCreateModal}>
          <HiOutlinePlus />
          Tambah Kategori
        </button>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <LoadingSpinner message="Memuat data kategori..." />
      ) : filteredCategories.length > 0 ? (
        <div className="categories-grid">
          {filteredCategories.map((category) => (
            <div key={category.id} className="category-card">
              <div className="category-icon">
                {category.icon || '🍔'}
              </div>
              
              <div className="category-info">
                <h3>{category.nama_kategori}</h3>
                <p>{category.deskripsi || 'Tidak ada deskripsi'}</p>
                <span className="category-count">
                  {category.food_count || 0} menu
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
                  title="Hapus"
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
          title="Belum ada kategori"
          description="Tambahkan kategori pertama untuk mengorganisir menu Anda"
          action={
            <button className="btn btn-primary" onClick={openCreateModal}>
              <HiOutlinePlus /> Tambah Kategori
            </button>
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nama Kategori *</label>
            <input
              type="text"
              className="form-input"
              name="nama_kategori"
              value={formData.nama_kategori}
              onChange={handleInputChange}
              placeholder="Masukkan nama kategori"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Deskripsi</label>
            <textarea
              className="form-textarea"
              name="deskripsi"
              value={formData.deskripsi}
              onChange={handleInputChange}
              placeholder="Masukkan deskripsi kategori"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Icon</label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(8, 1fr)', 
              gap: '0.5rem',
              padding: '1rem',
              background: 'var(--gray-50)',
              borderRadius: 'var(--radius-md)'
            }}>
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    border: formData.icon === icon ? '2px solid var(--primary-500)' : '2px solid transparent',
                    borderRadius: 'var(--radius-md)',
                    background: formData.icon === icon ? 'var(--primary-50)' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </div>

          <div className="modal-footer" style={{ padding: '1.25rem 0 0', borderTop: '1px solid var(--gray-100)', marginTop: '1rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={formLoading}
            >
              Batal
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={formLoading}
            >
              {formLoading ? 'Menyimpan...' : selectedCategory ? 'Update' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Kategori"
        message={`Apakah Anda yakin ingin menghapus kategori "${selectedCategory?.nama_kategori}"? Semua makanan dalam kategori ini akan menjadi tidak terkategori.`}
        confirmText="Ya, Hapus"
        type="danger"
        loading={formLoading}
      />
    </div>
  );
};

export default Categories;
