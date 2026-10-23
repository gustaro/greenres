import { useState } from 'react'
import { catalogApi, mapProduct, serializeProductDescription } from '../../lib/database'
import { PageHead, useAdminConfirm, useAdminModalFocus } from './AdminShared'
import { AdminProductOptionsModal } from './AdminProductOptionsModal'

export function AdminProductsTab({ products, setProducts, categories, notify, fail }) {
    const [isAdding, setIsAdding] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [editingProduct, setEditingProduct] = useState(null)
    const [isSavingEdit, setIsSavingEdit] = useState(false)
    const [editImagePreview, setEditImagePreview] = useState(null)
    const [editImageFile, setEditImageFile] = useState(null)
    const [optionsProduct, setOptionsProduct] = useState(null)
    const [savingOptions, setSavingOptions] = useState(false)
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const { confirm, isConfirming, confirmDialog } = useAdminConfirm()
    const [isEditDirty, setIsEditDirty] = useState(false)
    const editModalRef = useAdminModalFocus(Boolean(editingProduct), () => requestCloseEditModal(), isSavingEdit || isConfirming)

    const normalizedSearch = search.trim().toLowerCase()
    const visibleProducts = products.filter(product => {
        const matchesSearch = !normalizedSearch || `${product.name || ''} ${product.en || ''}`.toLowerCase().includes(normalizedSearch)
        const matchesCategory = categoryFilter === 'all' || product.categoryId === categoryFilter
        const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? product.isActive : !product.isActive)
        return matchesSearch && matchesCategory && matchesStatus
    })

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
            payload.append('description', serializeProductDescription(nameEn, extraDesc))
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
        if ('en' in changes || 'description' in changes) {
            const existingProduct = products.find(p => p.id === id)
            const enVal = 'en' in changes ? changes.en : (existingProduct?.en || '')
            const descVal = 'description' in changes ? changes.description : (existingProduct?.description || '')
            payload.description = serializeProductDescription(enVal, descVal)
        }
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
        }
        return false
    }

    const openEditModal = product => {
        setEditingProduct(product)
        setEditImagePreview(product.img || product.imageUrl || '')
        setEditImageFile(null)
        setIsEditDirty(false)
    }

    const closeEditModal = () => {
        setEditingProduct(null)
        setEditImagePreview(null)
        setEditImageFile(null)
        setIsEditDirty(false)
    }

    const requestCloseEditModal = async () => {
        if (isSavingEdit) return
        if (isEditDirty && !await confirm('มีข้อมูลสินค้าที่ยังไม่ได้บันทึก ต้องการปิดหน้าต่างนี้หรือไม่?', { title: 'ยังไม่ได้บันทึก', confirmLabel: 'ปิดโดยไม่บันทึก' })) return
        closeEditModal()
    }

    const handleEditModalSave = async event => {
        event.preventDefault()
        if (!editingProduct) return
        const form = new FormData(event.currentTarget)
        const name = String(form.get('name') || '').trim()
        const en = String(form.get('en') || '').trim()
        const description = String(form.get('description') || '').trim()
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
                description,
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
        if (!await confirm('คุณต้องการลบสินค้านี้ใช่หรือไม่?', { confirmLabel: 'ลบสินค้า' })) return
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

    const saveProductOptions = async groups => {
        if (!optionsProduct) return
        if (groups.some(group => !group.name.trim() || !group.options.length || group.options.some(option => !option.name.trim()))) {
            return notify('กรุณากรอกชื่อกลุ่มและชื่อตัวเลือกให้ครบ')
        }
        setSavingOptions(true)
        try {
            const updated = mapProduct(await catalogApi.updateProductOptions(optionsProduct.id, groups))
            setProducts(current => current.map(product => product.id === updated.id ? updated : product))
            setOptionsProduct(null)
            notify('บันทึกตัวเลือกสินค้าเรียบร้อยแล้ว')
        } catch (error) {
            fail(error)
        } finally {
            setSavingOptions(false)
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
                            <option key={category.id} value={category.id}>
                                {category.name} {category.nameEn ? `(${category.nameEn})` : ''}
                            </option>
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
                <div className="admin-form-field">
                    <span>รูปสินค้า</span>
                    <label className="admin-file-label">
                        <input name="image" type="file" accept="image/*" className="admin-file-input" />
                        <span><i className="bi bi-folder-fill text-warning" style={{ marginRight: 4 }}></i>เลือกรูปภาพ</span>
                    </label>
                </div>
                <button className="admin-primary" disabled={isAdding}>
                    {isAdding ? <><i className="bi bi-arrow-repeat spin" /> กำลังเพิ่มสินค้า...</> : '+ เพิ่มสินค้า'}
                </button>
            </form>
            <section className="admin-panel">
                <div className="admin-list-toolbar">
                    <label className="admin-list-search"><i className="bi bi-search" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหาชื่อสินค้า..." /></label>
                    <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} aria-label="กรองตามหมวดหมู่">
                        <option value="all">ทุกหมวดหมู่</option>
                        {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                    <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="กรองตามสถานะ">
                        <option value="all">ทุกสถานะ</option><option value="active">มีสินค้า</option><option value="inactive">สินค้าหมด</option>
                    </select>
                    <span>{visibleProducts.length} / {products.length} รายการ</span>
                </div>
                <div className="admin-product-options-guide">
                    <i className="bi bi-sliders2" />
                    <div>
                        <b>ตัวเลือกสินค้าใช้สำหรับอะไร?</b>
                        <span>ใช้ตั้งค่าขนาด ระดับความเผ็ด ท็อปปิ้ง หรือรายการเสริม พร้อมกำหนดราคาเพิ่มและจำนวนที่เลือกได้</span>
                    </div>
                </div>
                <div className="admin-table-wrap">
                    <table className="admin-products-table">
                        <thead>
                            <tr>
                                <th>สินค้า (ไทย / English)</th>
                                <th>ประเภท</th>
                                <th>ราคา</th>
                                <th>สต๊อก</th>
                                <th>สถานะ</th>
                                <th style={{ textAlign: 'center' }}>การจัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleProducts.map(product => (
                                <tr key={product.id}>
                                    <td data-label="สินค้า">
                                        <div className="admin-product-cell">
                                            <img src={product.img} alt={product.name} />
                                            <div className="admin-product-info">
                                                <strong>{product.name}</strong>
                                                <span>{product.en || 'ยังไม่มีชื่อภาษาอังกฤษ'}</span>
                                                <small className={product.optionGroups?.length ? 'configured' : ''}>
                                                    <i className="bi bi-ui-radios" />
                                                    {product.optionGroups?.length ? `ตั้งค่าตัวเลือกแล้ว ${product.optionGroups.length} กลุ่ม` : 'ยังไม่มีตัวเลือกเสริม'}
                                                </small>
                                            </div>
                                        </div>
                                    </td>
                                    <td data-label="ประเภท">
                                        <span className="admin-product-category">{categories.find(category => category.id === product.categoryId)?.name || 'ไม่ระบุหมวดหมู่'}</span>
                                    </td>
                                    <td data-label="ราคา"><strong className="admin-product-price">฿{Number(product.price || 0).toLocaleString()}</strong></td>
                                    <td data-label="สต๊อก"><span className={`admin-product-stock ${Number(product.stock || 0) <= 0 ? 'empty' : ''}`}>{Number(product.stock || 0).toLocaleString()}</span></td>
                                    <td data-label="สถานะ">
                                        <span className={`admin-product-status ${product.isActive ? 'active' : 'inactive'}`}>
                                            <i className={`bi ${product.isActive ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} />
                                            <span>{product.isActive ? 'มีสินค้า' : 'สินค้าหมด'}</span>
                                        </span>
                                    </td>
                                    <td data-label="การจัดการ">
                                        <div className="admin-product-actions">
                                            <button
                                                type="button"
                                                className="admin-product-option-btn"
                                                onClick={() => setOptionsProduct(product)}
                                                title="ตั้งค่าขนาด ความเผ็ด ท็อปปิ้ง รายการเสริม และราคาเพิ่ม"
                                            >
                                                <i className="bi bi-ui-radios" />
                                                <span>
                                                    <b>ตั้งค่าตัวเลือก</b>
                                                    <small>{product.optionGroups?.length ? `${product.optionGroups.length} กลุ่ม` : 'ยังไม่ตั้งค่า'}</small>
                                                </span>
                                            </button>
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
                                                className="admin-text-danger admin-product-delete-btn"
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
                    {visibleProducts.length === 0 && <div className="admin-empty"><span><i className="bi bi-search" /></span><p>ไม่พบสินค้าที่ตรงกับตัวกรอง</p></div>}
                </div>
            </section>

            {/* Modal แก้ไขสินค้า */}
            {editingProduct && (
                <div className="admin-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) requestCloseEditModal() }}>
                    <div className="admin-modal-card" role="dialog" aria-modal="true" ref={editModalRef}>
                        <div className="admin-modal-header">
                            <div className="admin-modal-title-wrap">
                                <h3><i className="bi bi-pencil-square text-success" />แก้ไขข้อมูลสินค้า</h3>
                                <small>รหัสสินค้า: {editingProduct.id}</small>
                            </div>
                            <button type="button" className="admin-modal-close" onClick={requestCloseEditModal} aria-label="ปิด">
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>
                        <form onSubmit={handleEditModalSave} onChange={() => setIsEditDirty(true)} style={{ display: 'contents' }}>
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
                                    <label>รายละเอียดเพิ่มเติม</label>
                                    <textarea
                                        name="description"
                                        defaultValue={editingProduct.description || ''}
                                        placeholder="รายละเอียดหรือจุดเด่นเมนู เช่น เผ็ดระดับ 2 อุดมด้วยวิตามิน แคลอรี่ต่ำ"
                                        rows="2"
                                    />
                                </div>

                                <div className="admin-modal-field">
                                    <label>หมวดหมู่สินค้า *</label>
                                    <select name="categoryId" defaultValue={editingProduct.categoryId} required>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name} {cat.nameEn ? `(${cat.nameEn})` : ''}
                                            </option>
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
                                <button type="button" className="admin-secondary" onClick={requestCloseEditModal} disabled={isSavingEdit}>
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
            <AdminProductOptionsModal product={optionsProduct} saving={savingOptions} onSave={saveProductOptions} onClose={() => !savingOptions && setOptionsProduct(null)} />
            {confirmDialog}
        </>
    )
}
