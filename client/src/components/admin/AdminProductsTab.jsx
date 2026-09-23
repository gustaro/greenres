import { useState } from 'react'
import { catalogApi, mapProduct } from '../../lib/database'
import { PageHead } from './AdminShared'

export function AdminProductsTab({ products, setProducts, categories, notify, fail }) {
    const [isAdding, setIsAdding] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [updatingImageId, setUpdatingImageId] = useState(null)
    const serverCanCreateSlug = name => /[a-z0-9]/i.test(name)

    const addProduct = async event => {
        event.preventDefault()
        const formElement = event.currentTarget
        const form = new FormData(formElement)
        const nameTh = String(form.get('nameTh') || '').trim()
        const nameEn = String(form.get('nameEn') || '').trim()
        const extraDesc = String(form.get('description') || '').trim()
        const requestedStock = Math.max(0, Number(form.get('stock') || 0))

        if (!nameTh) {
            return notify('กรุณาระบุชื่อสินค้าภาษาไทย')
        }

        // Ensure server slug can be created using English name if Thai has no alphanumeric chars
        let finalName = nameTh
        if (!serverCanCreateSlug(finalName)) {
            if (nameEn && serverCanCreateSlug(nameEn)) {
                finalName = `${nameTh} (${nameEn})`
            } else {
                return notify('กรุณาระบุชื่อภาษาอังกฤษที่มีตัวอักษร A-Z เพื่อให้ระบบสร้าง slug สินค้าได้')
            }
        }

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
            notify('เพิ่มสินค้าสำเร็จ (ทั้งชื่อไทยและอังกฤษ)')
        } catch (error) {
            fail(error)
        } finally {
            setIsAdding(false)
        }
    }

    const updateProduct = async (id, changes) => {
        if (changes.name && !serverCanCreateSlug(changes.name)) {
            return notify('ชื่อสินค้าต้องมี A-Z/0-9 อย่างน้อย 1 ตัว เนื่องจาก Server สร้าง slug อัตโนมัติ')
        }
        const payload = {}
        if ('categoryId' in changes) payload.categoryId = changes.categoryId
        if ('en' in changes) payload.description = changes.en
        if ('stock' in changes) {
            payload.stock = changes.stock
            payload.isActive = Number(changes.stock) > 0
        }
        if ('name' in changes) payload.name = changes.name
        if ('price' in changes) payload.price = changes.price
        if ('status' in changes) payload.isActive = !['หมด', 'วัตถุดิบไม่เพียงพอ'].includes(changes.status)

        let body = payload
        if (changes.imageFile instanceof File) {
            setUpdatingImageId(id)
            body = new FormData()
            Object.entries(payload).forEach(([key, value]) => body.append(key, String(value)))
            body.append('image', changes.imageFile)
        }
        try {
            const data = await catalogApi.updateProduct(id, body)
            setProducts(current => current.map(product => product.id === id ? mapProduct(data) : product))
            notify('อัปเดตสินค้าแล้ว')
        } catch (error) {
            fail(error)
        } finally {
            if (changes.imageFile instanceof File) {
                setUpdatingImageId(null)
            }
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
                    ชื่อสินค้า (English Name) *
                    <input name="nameEn" required placeholder="e.g. Crispy Basil Chicken Rice" />
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
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product.id}>
                                    <td>
                                        <div className="admin-product-cell">
                                            <img src={product.img} alt="" />
                                            <span>
                                                <small style={{ color: '#075c1b', fontWeight: 700, fontSize: 10 }}>ชื่อไทย:</small>
                                                <input
                                                    className="admin-text-input"
                                                    defaultValue={product.name}
                                                    placeholder="ชื่อภาษาไทย"
                                                    onBlur={event => event.target.value.trim() !== product.name && updateProduct(product.id, { name: event.target.value.trim() })}
                                                />
                                                <small style={{ color: '#075c1b', fontWeight: 700, fontSize: 10, marginTop: 4, display: 'block' }}>English Name:</small>
                                                <input
                                                    className="admin-text-input small"
                                                    defaultValue={product.en}
                                                    placeholder="English Name"
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
                                            className="admin-number-input"
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            defaultValue={product.price}
                                            onBlur={event => Number(event.target.value) !== product.price && updateProduct(product.id, { price: Number(event.target.value) })}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            className="admin-number-input"
                                            type="number"
                                            min="0"
                                            defaultValue={product.stock}
                                            onBlur={event => Number(event.target.value) !== product.stock && updateProduct(product.id, { stock: Math.max(0, Number(event.target.value)) })}
                                        />
                                    </td>
                                    <td>
                                        <i className={`admin-badge ${product.status === 'หมด' ? 'blocked' : product.status === 'เหลือน้อย' ? 'pending' : ''}`}>
                                            {product.status}
                                        </i>
                                    </td>
                                    <td>
                                        <button className="admin-text-danger" disabled={deletingId === product.id} onClick={() => deleteProduct(product.id)}>
                                            {deletingId === product.id ? <><i className="bi bi-arrow-repeat spin" /> ลบ...</> : 'ลบ'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    )
}
