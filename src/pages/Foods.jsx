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

  // Form state
  const [formData, setFormData] = useState({
    nama_makanan: '',
    category_id: '',
    deskripsi: '',
    harga: '',
    stok: '',
    gambar: null,
    status: 'tersedia'
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
      toast.error('Gagal memuat data makanan');
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
      status: 'tersedia'
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
          status: f.status || 'tersedia'
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
      status: food.status || 'tersedia'
    });
    setPreviewImage(food.gambar ? `http://localhost:8000/storage/${food.gambar}` : null);
    setIsModalOpen(true);
  };

  const openDeleteModal = (food) => {
    setSelectedFood(food);
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
        toast.error('Ukuran gambar maksimal 2MB');
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
      toast.error('Nama makanan harus diisi');
      return;
    }

    if (!formData.category_id) {
      toast.error('Kategori harus dipilih');
      return;
    }

    if (!formData.harga || formData.harga <= 0) {
      toast.error('Harga harus diisi dan lebih dari 0');
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
        toast.success(selectedFood ? 'Makanan berhasil diupdate' : 'Makanan berhasil ditambahkan');
        setIsModalOpen(false);
        fetchFoods();
      } else {
        toast.error(response.message || 'Terjadi kesalahan');
      }
    } catch (error) {
      console.error('Error saving food:', error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan data');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setFormLoading(true);
      const response = await foodService.delete(selectedFood.id);
      
      if (response.success) {
        toast.success('Makanan berhasil dihapus');
        setIsDeleteOpen(false);
        fetchFoods();
      } else {
        toast.error(response.message || 'Gagal menghapus data');
      }
    } catch (error) {
      console.error('Error deleting food:', error);
      toast.error('Gagal menghapus data');
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
              placeholder="Cari makanan..."
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
            <option value="all">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nama_kategori}</option>
            ))}
          </select>

          <div className="status-filters">
            <button className={`filter-tab ${selectedStatus === 'all' ? 'active' : ''}`} onClick={() => handleStatusFilter('all')}>Semua</button>
            <button className={`filter-tab ${selectedStatus === 'tersedia' ? 'active' : ''}`} onClick={() => handleStatusFilter('tersedia')}>Tersedia</button>
            <button className={`filter-tab ${selectedStatus === 'habis' ? 'active' : ''}`} onClick={() => handleStatusFilter('habis')}>Habis</button>
            <button className={`filter-tab ${selectedStatus === 'nonaktif' ? 'active' : ''}`} onClick={() => handleStatusFilter('nonaktif')}>Nonaktif</button>
          </div>
        </div>

        <button className="btn btn-primary" onClick={openCreateModal}>
          <HiOutlinePlus />
          Tambah Makanan
        </button>
      </div>

      {/* Foods Grid */}
      {loading ? (
        <LoadingSpinner message="Memuat data makanan..." />
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
                        tersedia: { label: 'Tersedia', icon: <IoCheckmarkCircleOutline />, cls: 'badge-success' },
                        habis: { label: 'Habis', icon: <IoAlertCircleOutline />, cls: 'badge-warning' },
                        nonaktif: { label: 'Nonaktif', icon: <IoCloseCircleOutline />, cls: 'badge-danger' }
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
                    {food.deskripsi || 'Tidak ada deskripsi'}
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
                        title="Hapus"
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
          title="Belum ada makanan"
          description="Tambahkan menu makanan pertama Anda"
          action={
            <button className="btn btn-primary" onClick={openCreateModal}>
              <HiOutlinePlus /> Tambah Makanan
            </button>
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedFood ? 'Edit Makanan' : 'Tambah Makanan Baru'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Nama Makanan *</label>
              <input
                type="text"
                className="form-input"
                name="nama_makanan"
                value={formData.nama_makanan}
                onChange={handleInputChange}
                placeholder="Masukkan nama makanan"
                required
              />
            </div>

            {selectedFood ? (
              <div className="form-group">
                <label className="form-label">Kode Makanan</label>
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
              <label className="form-label">Kategori *</label>
              <select
                className="form-select"
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                required
              >
                <option value="">Pilih Kategori</option>
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
                <option value="tersedia">Tersedia</option>
                <option value="habis">Habis</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Harga *</label>
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
              <label className="form-label">Stok</label>
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
            <label className="form-label">Deskripsi</label>
            <textarea
              className="form-textarea"
              name="deskripsi"
              value={formData.deskripsi}
              onChange={handleInputChange}
              placeholder="Masukkan deskripsi makanan"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Gambar</label>
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
                <p>Klik untuk upload gambar</p>
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
              Batal
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={formLoading}
            >
              {formLoading ? 'Menyimpan...' : selectedFood ? 'Update' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Makanan"
        message={`Apakah Anda yakin ingin menghapus "${selectedFood?.nama_makanan}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        type="danger"
        loading={formLoading}
      />
    </div>
  );
};

export default Foods;
