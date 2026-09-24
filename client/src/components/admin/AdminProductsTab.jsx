import { useState } from 'react'
import { catalogApi, mapProduct } from '../../lib/database'
import { PageHead } from './AdminShared'

export function AdminProductsTab({ products, setProducts, categories, notify, fail }) {
    const [isAdding, setIsAdding] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [updatingImageId, setUpdatingImageId] = useState(null)
    const [editingProduct, setEditingProduct] = useState(null)
    const [isSavingEdit, setIsSavingEdit] = useState(false)
    const [editImagePreview, setEditImagePreview] = useState(null)
    const [editImageFile, setEditImageFile] = useState(null)

    const addProduct = async event => {
        event.preventDefault()
        const formElement = event.currentTarget
        const form = new FormData(formElement)
        const nameTh = String(form.get('nameTh') || '').trim()
        const nameEn = String(form.get('nameEn') || '').trim()
        const extraDesc = String(form.get('description') || '').trim()
        const requestedStock = Math.max(0, Number(form.get('stock') || 0))

        if (!nameTh && !nameEn) {
            return notify('กรุณาระบุชื่อสินค้า')
        }

        const finalName = nameTh || nameEn

        setIsAdding(true)
        try {
            const payload = new FormData()
            payload.append('name', finalName)
            payload.append('description', nameEn || extraDesc || '')
            payload.append('categoryId', String(form.get('categoryId') || ''))
            payload.append('price', String(Number(form.get('price') || 0)))
            payload.append('stock', String(requestedStock === 0 ? 1 : requestedStock))
            const image = form.get('image')
            if (image instanceof File && image.size > 0) payload.append('image', image)
            let data = await catalogApi.createProduct(payload)
            if (requestedStock === 0) data = await catalogApi.updateProduct(data.id, { stock: 0, isActive: false })
            setProducts(current => [...current, mapProduct(data)])
            formElement.reset()
            notify('เพิ่มสินค้าสำเร็จ')
        } catch (error) {
            fail(error)
        } finally {
            setIsAdding(false)
        }
    }

    const updateProduct = async (id, changes) => {
        const payload = {}
        if ('categoryId' in changes) payload.categoryId = changes.categoryId
        if ('en' in changes) payload.description = changes.en
        if ('description' in changes) payload.description = changes.description
        if ('stock' in changes) {
            payload.stock = Number(changes.stock)
            if (!('isActive' in changes)) {
                payload.isActive = Number(changes.stock) > 0
            }
        }
        if ('name' in changes) payload.name = changes.name
        if ('price' in changes) payload.price = Number(changes.price)
        if ('isActive' in changes) payload.isActive = Boolean(changes.isActive)
        if ('status' in changes) payload.isActive = !['หมด', 'วัตถุดิบไม่เพียงพอ'].includes(changes.status)

        let body = payload
        if (changes.imageFile instanceof File) {
            setUpdatingImageId(id)
            body = new FormData()
            Object.entries(payload).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    body.append(key, String(value))
                }
            })
            body.append('image', changes.imageFile)
        }
        try {
            const data = await catalogApi.updateProduct(id, body)
            setProducts(current => current.map(product => product.id === id ? mapProduct(data) : product))
            notify('อัปเดตสินค้าเรียบร้อยแล้ว')
            return true
        } catch (error) {
            fail(error)
        } finally {
            if (changes.imageFile instanceof File) {
                setUpdatingImageId(null)
            }
        }
        return false
    }

    const openEditModal = product => {
        setEditingProduct(product)
        setEditImagePreview(product.img || product.imageUrl || '')
        setEditImageFile(null)
    }

    const closeEditModal = () => {
        setEditingProduct(null)
        setEditImagePreview(null)
        setEditImageFile(null)
    }

    const handleEditModalSave = async event => {
        event.preventDefault()
        if (!editingProduct) return
        const form = new FormData(event.currentTarget)
        const name = String(form.get('name') || '').trim()
        const en = String(form.get('en') || '').trim()
        const categoryId = String(form.get('categoryId') || '')
        const price = Number(form.get('price') || 0)
        const stock = Math.max(0, Number(form.get('stock') || 0))
        const isActive = form.get('isActive') === 'true'

        if (!name) {
            return notify('กรุณากรอกชื่อสินค้า')
        }

        setIsSavingEdit(true)
        try {
            const changes = {
                name,
                en,
                categoryId,
                price,
                stock,
                isActive,
            }
            if (editImageFile instanceof File) {
                changes.imageFile = editImageFile
            }
            const ok = await updateProduct(editingProduct.id, changes)
            if (ok) {
                closeEditModal()
            }
        } finally {
            setIsSavingEdit(false)
        }
    }

    const deleteProduct = async id => {
        if (!window.confirm('คุณต้องการลบสินค้านี้ใช่หรือไม่?')) return
        setDeletingId(id)
        try {
            await catalogApi.deleteProduct(id)
            setProducts(current => current.filter(item => item.id !== id))
            notify('ลบสินค้าแล้ว')
        } catch (error) {
            fail(error)
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <>
            <PageHead eyebrow="PRODUCTS" title="จัดการสินค้า" description="เพิ่มสินค้า ปรับราคา หมวดหมู่ และสถานะการขายทั้งภาษาไทยและอังกฤษ" />
            <form className="admin-grid-form products" onSubmit={addProduct}>
                <label>
                    ชื่อสินค้า (ภาษาไทย) *
                    <input name="nameTh" required placeholder="เช่น ข้าวกะเพราไก่กรอบ" />
                </label>
                <label>
                    ชื่อสินค้า (English Name)
                    <input name="nameEn" placeholder="e.g. Crispy Basil Chicken Rice" />
                </label>
                <label>
                    รายละเอียดเพิ่มเติม
                    <input name="description" placeholder="รายละเอียดหรือจุดเด่นเมนู" />
                </label>
                <label>
                    ประเภท
                    <select name="categoryId" required>
                        {categories.map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </select>
                </label>
                <label>
                    ราคา (บาท)
                    <input name="price" required type="number" min="0.01" step="0.01" placeholder="เช่น 129" />
                </label>
                <label>
                    สต๊อกเริ่มต้น
                    <input name="stock" required type="number" min="0" defaultValue="50" />
                </label>
                <label>
                    รูปสินค้า
                    <label className="admin-file-label">
                        <input name="image" type="file" accept="image/*" className="admin-file-input" />
                        <span><i className="bi bi-folder-fill text-warning" style={{ marginRight: 4 }}></i>เลือกรูปภาพ</span>
                    </label>
                </label>
                <button className="admin-primary" disabled={isAdding}>
                    {isAdding ? <><i className="bi bi-arrow-repeat spin" /> กำลังเพิ่มสินค้า...</> : '+ เพิ่มสินค้า'}
                </button>
            </form>
            <section className="admin-panel">
                <div className="admin-table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>สินค้า (ไทย / English)</th>
                                <th>เปลี่ยนรูป</th>
                                <th>ประเภท</th>
                                <th>ราคา</th>
                                <th>สต๊อก</th>
                                <th>สถานะ</th>
                                <th style={{ textAlign: 'center' }}>การจัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product.id}>
                                    <td>
                                        <div className="admin-product-cell">
                                            <img src={product.img} alt={product.name} />
                                            <span>
                                                <small style={{ color: 'var(--brand-primary-dark, #075c1b)', fontWeight: 700, fontSize: 10 }}>ชื่อไทย:</small>
                                                <input
                                                    key={`name-${product.id}-${product.name}`}
                                                    className="admin-text-input"
                                                    defaultValue={product.name}
                                                    placeholder="ชื่อภาษาไทย"
                                                    onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }}
                                                    onBlur={event => event.target.value.trim() && event.target.value.trim() !== product.name && updateProduct(product.id, { name: event.target.value.trim() })}
                                                />
                                                <small style={{ color: 'var(--brand-primary-dark, #075c1b)', fontWeight: 700, fontSize: 10, marginTop: 4, display: 'block' }}>English Name:</small>
                                                <input
                                                    key={`en-${product.id}-${product.en}`}
                                                    className="admin-text-input small"
                                                    defaultValue={product.en}
                                                    placeholder="English Name"
                                                    onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }}
                                                    onBlur={event => event.target.value.trim() !== product.en && updateProduct(product.id, { en: event.target.value.trim() })}
                                                />
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <label className="admin-file-label" style={{ opacity: updatingImageId === product.id ? 0.6 : 1, pointerEvents: updatingImageId === product.id ? 'none' : 'auto' }}>
                                            <input
                                                className="admin-file-input"
                                                type="file"
                                                accept="image/*"
                                                disabled={updatingImageId === product.id}
                                                onChange={event => event.target.files?.[0] && updateProduct(product.id, { imageFile: event.target.files[0] })}
                                            />
                                            <span>
                                                {updatingImageId === product.id ? (
                                                    <><i className="bi bi-arrow-repeat spin me-1" />อัปโหลด...</>
                                                ) : (
                                                    <><i className="bi bi-folder-fill text-warning" style={{ marginRight: 4 }}></i>เปลี่ยนรูป</>
                                                )}
                                            </span>
                                        </label>
                                    </td>
                                    <td>
                                        <select
                                            value={product.categoryId || ''}
                                            onChange={event => updateProduct(product.id, { categoryId: event.target.value })}
                                        >
                                            {categories.map(category => (
                                                <option key={category.id} value={category.id}>{category.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>
                                        <input
                                            key={`price-${product.id}-${product.price}`}
                                            className="admin-number-input"
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            defaultValue={product.price}
                                            onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }}
                                            onBlur={event => Number(event.target.value) > 0 && Number(event.target.value) !== product.price && updateProduct(product.id, { price: Number(event.target.value) })}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            key={`stock-${product.id}-${product.stock}`}
                                            className="admin-number-input"
                                            type="number"
                                            min="0"
                                            defaultValue={product.stock}
                                            onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }}
                                            onBlur={event => event.target.value !== '' && Number(event.target.value) !== product.stock && updateProduct(product.id, { stock: Math.max(0, Number(event.target.value)) })}
                                        />
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className={`admin-badge-btn ${product.isActive ? 'active' : 'inactive'}`}
                                            onClick={() => updateProduct(product.id, { isActive: !product.isActive })}
                                            title="คลิกเพื่อสลับสถานะ มีสินค้า / สินค้าหมด"
                                        >
                                            <i className={`bi ${product.isActive ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} />
                                            <span>{product.isActive ? 'มีสินค้า' : 'สินค้าหมด'}</span>
                                        </button>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                            <button
                                                type="button"
                                                className="btn-edit-action"
                                                onClick={() => openEditModal(product)}
                                                title="แก้ไขข้อมูลสินค้าแบบละเอียด"
                                            >
                                                <i className="bi bi-pencil-square" />
                                                <span>แก้ไข</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-text-danger"
                                                disabled={deletingId === product.id}
                                                onClick={() => deleteProduct(product.id)}
                                                title="ลบสินค้านี้"
                                            >
                                                {deletingId === product.id ? <><i className="bi bi-arrow-repeat spin" /> ลบ...</> : 'ลบ'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Modal แก้ไขสินค้า */}
            {editingProduct && (
                <div className="admin-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) closeEditModal() }}>
                    <div className="admin-modal-card" role="dialog" aria-modal="true">
                        <div className="admin-modal-header">
                            <div className="admin-modal-title-wrap">
                                <h3><i className="bi bi-pencil-square text-success" />แก้ไขข้อมูลสินค้า</h3>
                                <small>รหัสสินค้า: {editingProduct.id}</small>
                            </div>
                            <button type="button" className="admin-modal-close" onClick={closeEditModal} aria-label="ปิด">
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>
                        <form onSubmit={handleEditModalSave} style={{ display: 'contents' }}>
                            <div className="admin-modal-body">
                                <div className="admin-modal-image-row">
                                    <img
                                        src={editImagePreview || editingProduct.img || '/assets/basil-rice.png'}
                                        alt="รูปตัวอย่างสินค้า"
                                        className="admin-modal-image-preview"
                                    />
                                    <div className="admin-modal-image-actions">
                                        <label>รูปภาพสินค้า</label>
                                        <label className="admin-file-label" style={{ width: 'auto' }}>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="admin-file-input"
                                                onChange={event => {
                                                    const file = event.target.files?.[0]
                                                    if (file) {
                                                        setEditImageFile(file)
                                                        setEditImagePreview(URL.createObjectURL(file))
                                                    }
                                                }}
                                            />
                                            <span style={{ minHeight: 34, padding: '0 12px' }}>
                                                <i className="bi bi-camera-fill" style={{ marginRight: 6 }} />
                                                {editImageFile ? 'เลือกไฟล์ใหม่แล้ว' : 'เปลี่ยนรูปสินค้า'}
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <div className="admin-modal-grid-2">
                                    <div className="admin-modal-field">
                                        <label>ชื่อสินค้า (ภาษาไทย) *</label>
                                        <input
                                            name="name"
                                            required
                                            defaultValue={editingProduct.name}
                                            placeholder="เช่น ข้าวกะเพราไก่กรอบ"
                                        />
                                    </div>
                                    <div className="admin-modal-field">
                                        <label>ชื่อสินค้า (English Name)</label>
                                        <input
                                            name="en"
                                            defaultValue={editingProduct.en}
                                            placeholder="e.g. Crispy Basil Chicken Rice"
                                        />
                                    </div>
                                </div>

                                <div className="admin-modal-field">
                                    <label>หมวดหมู่สินค้า *</label>
                                    <select name="categoryId" defaultValue={editingProduct.categoryId} required>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="admin-modal-grid-2">
                                    <div className="admin-modal-field">
                                        <label>ราคา (บาท) *</label>
                                        <input
                                            name="price"
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            required
                                            defaultValue={editingProduct.price}
                                            placeholder="เช่น 129"
                                        />
                                    </div>
                                    <div className="admin-modal-field">
                                        <label>สต๊อกสินค้า (ชิ้น) *</label>
                                        <input
                                            name="stock"
                                            type="number"
                                            min="0"
                                            required
                                            defaultValue={editingProduct.stock}
                                            placeholder="เช่น 50"
                                        />
                                    </div>
                                </div>

                                <div className="admin-modal-field">
                                    <label>สถานะการขาย *</label>
                                    <select name="isActive" defaultValue={editingProduct.isActive ? 'true' : 'false'}>
                                        <option value="true">🟢 เปิดขาย (มีสินค้า พร้อมจำหน่าย)</option>
                                        <option value="false">🔴 ปิดขาย (สินค้าหมด / พักจำหน่าย)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="admin-modal-footer">
                                <button type="button" className="admin-secondary" onClick={closeEditModal} disabled={isSavingEdit}>
                                    ยกเลิก
                                </button>
                                <button type="submit" className="admin-primary" disabled={isSavingEdit}>
                                    {isSavingEdit ? (
                                        <><i className="bi bi-arrow-repeat spin me-1" />กำลังบันทึก...</>
                                    ) : (
                                        <><i className="bi bi-check2-circle me-1" />บันทึกการแก้ไข</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
