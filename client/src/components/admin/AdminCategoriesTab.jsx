import { useState } from 'react'
import { catalogApi, mapCategory } from '../../lib/database'
import { PageHead } from './AdminShared'

export function AdminCategoriesTab({ categories, setCategories, products, notify, fail }) {
    const [isAdding, setIsAdding] = useState(false)
    const [deletingId, setDeletingId] = useState(null)

    const addCategory = async event => {
        event.preventDefault()
        const formElement = event.currentTarget
        const form = new FormData(formElement)
        const name = form.get('name').trim()
        const nameEn = String(form.get('nameEn') || '').trim()
        if (!name) return
        setIsAdding(true)
        try {
            const data = await catalogApi.createCategory({
                name,
                nameEn,
                description: nameEn,
                sortOrder: categories.length
            })
            setCategories(current => [...current, mapCategory(data)])
            formElement.reset()
            notify('เพิ่มประเภทสินค้าแล้ว')
        } catch (error) {
            fail(error)
        } finally {
            setIsAdding(false)
        }
    }

    const updateCategory = async (id, changes) => {
        try {
            const data = await catalogApi.updateCategory(id, changes)
            setCategories(current => current.map(category => category.id === id ? mapCategory(data) : category))
            notify('อัปเดตประเภทสินค้าแล้ว')
        } catch (error) {
            fail(error)
        }
    }

    const deleteCategory = async id => {
        if (products.some(product => product.categoryId === id)) {
            return notify('ลบไม่ได้ เนื่องจากยังมีสินค้าในประเภทนี้')
        }
        if (!window.confirm('คุณต้องการลบประเภทสินค้านี้ใช่หรือไม่?')) return
        setDeletingId(id)
        try {
            await catalogApi.deleteCategory(id)
            setCategories(current => current.filter(category => category.id !== id))
            notify('ลบประเภทสินค้าแล้ว')
        } catch (error) {
            fail(error)
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <>
            <PageHead eyebrow="CATALOG" title="จัดการประเภทสินค้า" description="จัดหมวดหมู่ทั้งภาษาไทยและอังกฤษ เพื่อให้ลูกค้าค้นหาเมนูได้ง่ายขึ้น" />
            <form className="admin-inline-form" onSubmit={addCategory} style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <label style={{ flex: '1 1 200px' }}>
                    ชื่อประเภทสินค้า (ภาษาไทย) *
                    <input name="name" required placeholder="เช่น อาหารทานเล่น, สลัด" />
                </label>
                <label style={{ flex: '1 1 200px' }}>
                    ชื่อภาษาอังกฤษ (English Name)
                    <input name="nameEn" placeholder="e.g. Appetizers, Salads" />
                </label>
                <button className="admin-primary" disabled={isAdding} style={{ minHeight: 40 }}>
                    {isAdding ? <><i className="bi bi-arrow-repeat spin" /> กำลังเพิ่ม...</> : '+ เพิ่มประเภท'}
                </button>
            </form>
            <section className="admin-panel">
                <div className="admin-table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>ชื่อประเภท (ไทย)</th>
                                <th>ชื่อภาษาอังกฤษ (English Name)</th>
                                <th>ลำดับ</th>
                                <th>จำนวนสินค้า</th>
                                <th>การจัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map(category => (
                                <tr key={category.id}>
                                    <td>
                                        <input
                                            key={`cat-name-${category.id}-${category.name}`}
                                            className="admin-text-input"
                                            defaultValue={category.name}
                                            placeholder="ชื่อภาษาไทย"
                                            onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }}
                                            onBlur={event => event.target.value.trim() && event.target.value.trim() !== category.name && updateCategory(category.id, { name: event.target.value.trim() })}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            key={`cat-en-${category.id}-${category.nameEn}`}
                                            className="admin-text-input"
                                            defaultValue={category.nameEn || ''}
                                            placeholder="e.g. Appetizers, Salads"
                                            onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }}
                                            onBlur={event => event.target.value.trim() !== (category.nameEn || '') && updateCategory(category.id, { nameEn: event.target.value.trim(), description: event.target.value.trim() })}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            key={`cat-sort-${category.id}-${category.sort_order}`}
                                            className="admin-number-input"
                                            type="number"
                                            min="0"
                                            defaultValue={category.sort_order}
                                            onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }}
                                            onBlur={event => Number(event.target.value) !== category.sort_order && updateCategory(category.id, { sortOrder: Number(event.target.value) })}
                                        />
                                    </td>
                                    <td>
                                        {products.filter(product => product.categoryId === category.id).length} รายการ
                                    </td>
                                    <td>
                                        <button className="admin-text-danger" disabled={deletingId === category.id} onClick={() => deleteCategory(category.id)}>
                                            {deletingId === category.id ? <><i className="bi bi-arrow-repeat spin" /> ลบ...</> : 'ลบ'}
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
