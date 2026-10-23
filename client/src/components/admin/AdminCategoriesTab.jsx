import { useRef, useState } from 'react'
import { catalogApi, mapCategory } from '../../lib/database'
import { PageHead, useAdminConfirm } from './AdminShared'

export function AdminCategoriesTab({ categories, setCategories, products, notify, fail }) {
    const [isAdding, setIsAdding] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [draggingId, setDraggingId] = useState(null)
    const [dragOverId, setDragOverId] = useState(null)
    const [isReordering, setIsReordering] = useState(false)
    const dragSnapshotRef = useRef([])
    const dropCommittedRef = useRef(false)
    const { confirm, confirmDialog } = useAdminConfirm()

    const withSequentialOrder = list => list.map((category, index) => ({
        ...category,
        sortOrder: index + 1,
        sort_order: index + 1,
    }))

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

    const persistCategoryOrder = async orderedCategories => {
        setIsReordering(true)
        try {
            await catalogApi.reorderCategories(orderedCategories.map(category => category.id))
            notify('บันทึกลำดับหมวดหมู่แล้ว')
        } catch (error) {
            setCategories(dragSnapshotRef.current)
            fail(error)
        } finally {
            setIsReordering(false)
        }
    }

    const startDragging = (event, categoryId) => {
        const startedFromHandle = event.target.closest('.admin-category-drag-handle')
        const startedFromControl = event.target.closest('input, button, select, textarea, a')
        if (startedFromControl && !startedFromHandle) {
            event.preventDefault()
            return
        }
        if (isReordering) {
            event.preventDefault()
            return
        }
        dragSnapshotRef.current = categories
        dropCommittedRef.current = false
        setDraggingId(categoryId)
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', categoryId)
    }

    const moveDraggedCategory = (event, targetId) => {
        event.preventDefault()
        if (!draggingId || draggingId === targetId || isReordering) return
        event.dataTransfer.dropEffect = 'move'
        setDragOverId(targetId)
    }

    const dropCategory = async (event, targetId) => {
        event.preventDefault()
        if (!draggingId || isReordering) return
        const fromIndex = categories.findIndex(category => category.id === draggingId)
        const toIndex = categories.findIndex(category => category.id === targetId)
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
            finishDragging()
            return
        }

        const reordered = [...categories]
        const [draggedCategory] = reordered.splice(fromIndex, 1)
        reordered.splice(toIndex, 0, draggedCategory)
        const normalized = withSequentialOrder(reordered)
        setCategories(normalized)
        dropCommittedRef.current = true
        setDraggingId(null)
        setDragOverId(null)
        await persistCategoryOrder(normalized)
    }

    const finishDragging = () => {
        if (!dropCommittedRef.current && draggingId) {
            setCategories(dragSnapshotRef.current)
        }
        setDraggingId(null)
        setDragOverId(null)
    }

    const moveCategory = async (index, direction) => {
        const targetIndex = index + direction
        if (isReordering || targetIndex < 0 || targetIndex >= categories.length) return
        dragSnapshotRef.current = categories
        const reordered = [...categories]
        ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
        const normalized = withSequentialOrder(reordered)
        setCategories(normalized)
        await persistCategoryOrder(normalized)
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
        if (!await confirm('คุณต้องการลบประเภทสินค้านี้ใช่หรือไม่?', { confirmLabel: 'ลบประเภท' })) return
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
                <div className="admin-category-order-note">
                    <i className="bi bi-grip-vertical" aria-hidden="true" />
                    <span>ลากจากไอคอนหรือพื้นที่ว่างของทั้งแถวเพื่อสลับตำแหน่ง ระบบจะบันทึกลำดับให้อัตโนมัติ</span>
                    {isReordering && <span className="admin-category-saving"><i className="bi bi-arrow-repeat spin" /> กำลังบันทึก...</span>}
                </div>
                <div className="admin-table-wrap">
                    <table className="admin-category-table admin-responsive-table">
                        <thead>
                            <tr>
                                <th className="admin-category-drag-column" aria-label="ลากเพื่อจัดลำดับ"><i className="bi bi-grip-vertical" /></th>
                                <th>ชื่อประเภท (ไทย)</th>
                                <th>ชื่อภาษาอังกฤษ (English Name)</th>
                                <th>ลำดับ</th>
                                <th>จำนวนสินค้า</th>
                                <th>การจัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((category, index) => (
                                <tr
                                    key={category.id}
                                    className={`${draggingId === category.id ? 'admin-category-row-dragging' : ''} ${dragOverId === category.id ? 'admin-category-row-over' : ''}`.trim()}
                                    draggable={!isReordering}
                                    onDragStart={event => startDragging(event, category.id)}
                                    onDragOver={event => moveDraggedCategory(event, category.id)}
                                    onDrop={event => dropCategory(event, category.id)}
                                    onDragEnd={finishDragging}
                                    title={`ลากเพื่อย้าย ${category.name}`}
                                >
                                    <td className="admin-category-drag-cell" data-label="จัดลำดับ">
                                        <span className="admin-category-drag-handle" role="img" aria-label={`ลากเพื่อเปลี่ยนลำดับหมวดหมู่ ${category.name}`}>
                                            <i className="bi bi-grip-vertical" aria-hidden="true" />
                                        </span>
                                        <span className="admin-category-mobile-order">
                                            <button type="button" disabled={index === 0 || isReordering} onClick={() => moveCategory(index, -1)} aria-label={`เลื่อน ${category.name} ขึ้น`}><i className="bi bi-chevron-up" /></button>
                                            <button type="button" disabled={index === categories.length - 1 || isReordering} onClick={() => moveCategory(index, 1)} aria-label={`เลื่อน ${category.name} ลง`}><i className="bi bi-chevron-down" /></button>
                                        </span>
                                    </td>
                                    <td data-label="ชื่อภาษาไทย">
                                        <input
                                            key={`cat-name-${category.id}-${category.name}`}
                                            className="admin-text-input"
                                            defaultValue={category.name}
                                            placeholder="ชื่อภาษาไทย"
                                            onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }}
                                            onBlur={event => event.target.value.trim() && event.target.value.trim() !== category.name && updateCategory(category.id, { name: event.target.value.trim() })}
                                        />
                                    </td>
                                    <td data-label="English Name">
                                        <input
                                            key={`cat-en-${category.id}-${category.nameEn}`}
                                            className="admin-text-input"
                                            defaultValue={category.nameEn || ''}
                                            placeholder="e.g. Appetizers, Salads"
                                            onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }}
                                            onBlur={event => event.target.value.trim() !== (category.nameEn || '') && updateCategory(category.id, { nameEn: event.target.value.trim(), description: event.target.value.trim() })}
                                        />
                                    </td>
                                    <td data-label="ลำดับ">
                                        <div className="admin-category-order">
                                            <span>{index + 1}</span>
                                        </div>
                                    </td>
                                    <td data-label="จำนวนสินค้า">
                                        {products.filter(product => product.categoryId === category.id).length} รายการ
                                    </td>
                                    <td data-label="การจัดการ">
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
            {confirmDialog}
        </>
    )
}
