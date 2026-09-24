import { useMemo, useState } from 'react'
import { adminApi } from '../../lib/database'

export function KitchenInventoryTab({ inventory, setInventory }) {
    const [drafts, setDrafts] = useState({})
    const [savingId, setSavingId] = useState(null)
    const [savedIds, setSavedIds] = useState(new Set())
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')

    const getQty = item => (drafts[item.id] !== undefined ? drafts[item.id] : item.quantity)

    const handleQtyChange = (item, newQty) => {
        const val = Math.max(0, parseInt(newQty, 10) || 0)
        setDrafts(prev => ({ ...prev, [item.id]: val }))
    }

    const handleStep = (item, delta) => {
        const current = getQty(item)
        handleQtyChange(item, current + delta)
    }

    const handleUpdateRow = async item => {
        const targetQty = getQty(item)
        setSavingId(item.id)
        try {
            await adminApi.updateInventory(item.id, { quantity: targetQty })
            setInventory(current => current.map(i => (i.id === item.id ? { ...i, quantity: targetQty } : i)))
            setDrafts(prev => {
                const next = { ...prev }
                delete next[item.id]
                return next
            })
            setSavedIds(prev => new Set([...prev, item.id]))
            setTimeout(() => {
                setSavedIds(prev => {
                    const next = new Set(prev)
                    next.delete(item.id)
                    return next
                })
            }, 2500)
        } catch (error) {
            window.alert('ไม่สามารถอัพเดทสต๊อกได้: ' + error.message)
        } finally {
            setSavingId(null)
        }
    }

    const changedItems = useMemo(() => {
        return inventory.filter(item => drafts[item.id] !== undefined && drafts[item.id] !== item.quantity)
    }, [inventory, drafts])

    const handleUpdateAllChanged = async () => {
        if (changedItems.length === 0) return
        setSavingId('all')
        try {
            for (const item of changedItems) {
                const targetQty = getQty(item)
                await adminApi.updateInventory(item.id, { quantity: targetQty })
            }
            setInventory(current =>
                current.map(i => (drafts[i.id] !== undefined ? { ...i, quantity: drafts[i.id] } : i))
            )
            setDrafts({})
            window.alert(`อัพเดทสต๊อกสำเร็จ ${changedItems.length} รายการ`)
        } catch (error) {
            window.alert('เกิดข้อผิดพลาดในการอัพเดททั้งหมด: ' + error.message)
        } finally {
            setSavingId(null)
        }
    }

    const categoryOptions = useMemo(() => {
        const categories = new Map()
        inventory.forEach(item => {
            const id = item.categoryId || item.categoryName || 'other'
            if (!categories.has(id)) {
                categories.set(id, {
                    id,
                    name: item.categoryName || 'อื่น ๆ',
                    sortOrder: item.categorySortOrder || 999,
                })
            }
        })
        return [...categories.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'th'))
    }, [inventory])

    const filteredInventory = useMemo(() => {
        const q = search.trim().toLowerCase()
        return inventory.filter(item => {
            const itemCategory = item.categoryId || item.categoryName || 'other'
            const matchesCategory = categoryFilter === 'all' || itemCategory === categoryFilter
            const matchesSearch = !q || [item.ingredientName, item.ingredientNameEn, item.categoryName]
                .some(value => (value || '').toLowerCase().includes(q))
            return matchesCategory && matchesSearch
        })
    }, [inventory, search, categoryFilter])

    const groupedInventory = useMemo(() => {
        const groups = new Map()
        filteredInventory.forEach(item => {
            const key = item.categoryName || 'อื่น ๆ'
            if (!groups.has(key)) groups.set(key, { name: key, sortOrder: item.categorySortOrder || 999, items: [] })
            groups.get(key).items.push(item)
        })
        return [...groups.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'th'))
    }, [filteredInventory])

    return (
        <section>
            <div className="staff-section-head" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <h2>สต๊อกวัตถุดิบ (Kitchen Inventory)</h2>
                    <p>ปรับปรุงปริมาณสต๊อกวัตถุดิบและบันทึกข้อมูลอัพเดทรายการ</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {changedItems.length > 0 && (
                        <button
                            type="button"
                            onClick={handleUpdateAllChanged}
                            disabled={savingId === 'all'}
                            className="kitchen-update-btn changed"
                            style={{ padding: '8px 16px', fontSize: 13 }}
                        >
                            <i className="bi bi-cloud-arrow-up-fill"></i>
                            {savingId === 'all' ? 'กำลังบันทึก...' : `อัพเดททั้งหมดที่แก้ไข (${changedItems.length})`}
                        </button>
                    )}
                    <select
                        className="cashier-search"
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        aria-label="เลือกหมวดวัตถุดิบ"
                        style={{ padding: '7px 36px 7px 14px', borderRadius: 10, minWidth: 190 }}
                    >
                        <option value="all">ทุกหมวดวัตถุดิบ</option>
                        {categoryOptions.map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </select>
                    <input
                        className="cashier-search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="ค้นหาวัตถุดิบ..."
                        style={{ padding: '7px 14px', borderRadius: 10, width: 220 }}
                    />
                </div>
            </div>

            <div className="staff-table" style={{ background: '#ffffff', borderRadius: 16, border: '2px solid #d8e7d2', overflow: 'hidden' }}>
                <table>
                    <thead>
                        <tr style={{ background: '#f6faf2' }}>
                            <th style={{ padding: '14px 16px' }}>วัตถุดิบ</th>
                            <th style={{ padding: '14px 16px' }}>คงเหลือปัจจุบัน</th>
                            <th style={{ padding: '14px 16px' }}>สถานะสต๊อก</th>
                            <th style={{ padding: '14px 16px', textAlign: 'center' }}>ปรับเพิ่ม / ลด</th>
                            <th style={{ padding: '14px 16px', textAlign: 'center' }}>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInventory.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#6d7b6e' }}>
                                    {search || categoryFilter !== 'all' ? 'ไม่พบวัตถุดิบตามตัวกรอง' : 'ไม่มีรายการวัตถุดิบ'}
                                </td>
                            </tr>
                        ) : (
                            groupedInventory.flatMap(group => [
                                <tr className="kitchen-inventory-category-row" key={`category-${group.name}`}>
                                    <td colSpan={5}><i className="bi bi-grid-fill" /> {group.name} <small>{group.items.length} รายการ</small></td>
                                </tr>,
                                ...group.items.map(item => {
                                const currentDraft = getQty(item)
                                const isChanged = drafts[item.id] !== undefined && drafts[item.id] !== item.quantity
                                const isSaving = savingId === item.id || savingId === 'all'
                                const isSaved = savedIds.has(item.id)
                                const isLow = currentDraft <= (item.lowThreshold ?? 0)
                                const isOut = currentDraft <= 0

                                return <tr key={item.id} style={{ background: isChanged ? '#fafffa' : undefined }}>
                                        <td style={{ padding: '14px 16px' }}>
                                            <b style={{ fontSize: 14, color: '#17351f' }}>{item.ingredientName}</b>
                                            {item.ingredientNameEn && <small style={{ display: 'block', color: '#6d7b6e', marginTop: 2 }}>{item.ingredientNameEn}</small>}
                                            <small style={{ display: 'block', color: 'var(--brand-primary, #12852f)', marginTop: 3 }}>ใช้ใน {item.recipeCount || 0} สูตร</small>
                                            {isChanged && (
                                                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--brand-primary, #12852f)', fontWeight: 800 }}>
                                                    (เปลี่ยนจาก {item.quantity} → {currentDraft})
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <strong style={{ fontSize: 14, color: isOut ? '#dc2626' : isLow ? '#d97706' : 'var(--brand-primary-dark, #075c1b)' }}>
                                                {item.quantity} {item.unit || 'ชิ้น'}
                                            </strong>
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 800,
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                background: isOut ? '#fee2e2' : isLow ? '#fef3c7' : 'var(--brand-accent-soft, #effbdc)',
                                                color: isOut ? '#b91c1c' : isLow ? '#b45309' : 'var(--brand-primary-dark, #075c1b)',
                                                border: `1px solid ${isOut ? '#fca5a5' : isLow ? '#fcd34d' : 'var(--brand-accent, #9fe51f)'}`
                                            }}>
                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isOut ? '#dc2626' : isLow ? '#f59e0b' : 'var(--brand-primary, #12852f)' }}></span>
                                                {isOut ? 'หมดสต๊อก' : isLow ? 'ใกล้หมด' : 'พร้อมใช้'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                            <div className="kitchen-inventory-stepper">
                                                <button
                                                    type="button"
                                                    className="kitchen-stepper-btn"
                                                    onClick={() => handleStep(item, -1)}
                                                    disabled={currentDraft <= 0 || isSaving}
                                                    title="ลด 1"
                                                >
                                                    <i className="bi bi-dash"></i>
                                                </button>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="kitchen-stepper-input"
                                                    value={currentDraft}
                                                    onChange={e => handleQtyChange(item, e.target.value)}
                                                    disabled={isSaving}
                                                />
                                                <button
                                                    type="button"
                                                    className="kitchen-stepper-btn plus"
                                                    onClick={() => handleStep(item, 1)}
                                                    disabled={isSaving}
                                                    title="เพิ่ม 1"
                                                >
                                                    <i className="bi bi-plus"></i>
                                                </button>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateRow(item)}
                                                disabled={(!isChanged && !isSaved) || isSaving}
                                                className={`kitchen-update-btn ${isSaved ? 'saved' : isChanged ? 'changed' : ''}`}
                                            >
                                                <i className={`bi ${isSaving ? 'bi-hourglass-split' : isSaved ? 'bi-check-lg' : isChanged ? 'bi-check2-circle' : 'bi-check'}`}></i>
                                                {isSaving ? 'กำลังบันทึก...' : isSaved ? 'บันทึกแล้ว' : isChanged ? 'อัพเดทรายการ' : 'อัพเดท'}
                                            </button>
                                        </td>
                                    </tr>
                                }),
                            ])
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    )
}
