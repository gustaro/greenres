import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/database'
import { useAdminConfirm, useAdminModalFocus } from './AdminShared'
import './AdminProductOptionsModal.css'

const newOption = () => ({ name: '', nameEn: '', priceAdjustment: 0, ingredientId: '', ingredientQuantity: '', isDefault: false, isActive: true })
const newGroup = () => ({ name: '', nameEn: '', selectionType: 'SINGLE', isRequired: true, minSelections: 1, maxSelections: 1, isActive: true, options: [newOption()] })

export function AdminProductOptionsModal({ product, onClose, onSave, saving }) {
    const [groups, setGroups] = useState([])
    const [ingredients, setIngredients] = useState([])
    const { confirm, isConfirming, confirmDialog } = useAdminConfirm()
    const initialGroups = (product?.optionGroups || []).map(group => ({ ...group, options: (group.options || []).map(option => ({ ...option })) }))
    const isDirty = Boolean(product) && JSON.stringify(groups) !== JSON.stringify(initialGroups)
    const requestClose = async () => {
        if (saving) return
        if (isDirty && !await confirm('มีการแก้ไขตัวเลือกสินค้าที่ยังไม่ได้บันทึก ต้องการปิดหรือไม่?', { title: 'ยังไม่ได้บันทึก', confirmLabel: 'ปิดโดยไม่บันทึก' })) return
        onClose()
    }
    const modalRef = useAdminModalFocus(Boolean(product), requestClose, saving || isConfirming)

    useEffect(() => {
        setGroups((product?.optionGroups || []).map(group => ({
            ...group,
            options: (group.options || []).map(option => ({ ...option })),
        })))
        adminApi.inventory().then(setIngredients).catch(() => setIngredients([]))
    }, [product])

    if (!product) return null

    const updateGroup = (groupIndex, changes) => setGroups(current => current.map((group, index) => index === groupIndex ? { ...group, ...changes } : group))
    const updateOption = (groupIndex, optionIndex, changes) => setGroups(current => current.map((group, index) => index !== groupIndex ? group : {
        ...group,
        options: group.options.map((option, currentIndex) => currentIndex === optionIndex ? { ...option, ...changes } : option),
    }))
    const addOption = groupIndex => setGroups(current => current.map((group, index) => index === groupIndex ? { ...group, options: [...group.options, newOption()] } : group))
    const removeOption = (groupIndex, optionIndex) => setGroups(current => current.map((group, index) => index === groupIndex ? { ...group, options: group.options.filter((_, currentIndex) => currentIndex !== optionIndex) } : group))
    const setDefault = (groupIndex, optionIndex, checked) => setGroups(current => current.map((group, index) => {
        if (index !== groupIndex) return group
        return {
            ...group,
            options: group.options.map((option, currentIndex) => ({
                ...option,
                isDefault: group.selectionType === 'SINGLE' ? currentIndex === optionIndex : currentIndex === optionIndex ? checked : option.isDefault,
            })),
        }
    }))
    const move = (groupIndex, optionIndex, direction) => setGroups(current => current.map((group, index) => {
        if (index !== groupIndex) return group
        const nextIndex = optionIndex + direction
        if (nextIndex < 0 || nextIndex >= group.options.length) return group
        const options = [...group.options]
        ;[options[optionIndex], options[nextIndex]] = [options[nextIndex], options[optionIndex]]
        return { ...group, options }
    }))

    return (
        <>
        <div className="admin-option-backdrop" onMouseDown={event => event.target === event.currentTarget && requestClose()}>
            <section className="admin-option-modal" role="dialog" aria-modal="true" ref={modalRef}>
                <header>
                    <div><small>PRODUCT OPTIONS</small><h3>ตัวเลือกเสริม — {product.name}</h3><p>สร้างกลุ่ม เช่น เลือกเนื้อสัตว์ แล้วกำหนดราคาและวัตถุดิบของแต่ละตัวเลือก</p></div>
                    <button type="button" onClick={requestClose}><i className="bi bi-x-lg" /></button>
                </header>
                <div className="admin-option-body">
                    <div className="admin-option-recipe-note"><i className="bi bi-info-circle-fill" /><span><b>การตัดสต๊อก:</b> วัตถุดิบที่เปลี่ยนตามตัวเลือก เช่น เนื้อไก่หรือหมูกรอบ ควรผูกไว้ที่ตัวเลือกนี้และไม่ใส่ซ้ำในสูตรหลัก ส่วนข้าว ซอส และใบกะเพรายังคงอยู่ในสูตรหลักตามเดิม</span></div>
                    {groups.length === 0 && <div className="admin-option-empty"><i className="bi bi-ui-radios" /><b>สินค้านี้ยังไม่มีกลุ่มตัวเลือก</b><span>กด “เพิ่มกลุ่มตัวเลือก” เพื่อเริ่มตั้งค่า</span></div>}
                    {groups.map((group, groupIndex) => (
                        <article className="admin-option-group" key={group.id || groupIndex}>
                            <div className="admin-option-group-head">
                                <span className="admin-option-group-number">{groupIndex + 1}</span>
                                <label>ชื่อกลุ่ม (ไทย) *<input value={group.name} onChange={event => updateGroup(groupIndex, { name: event.target.value })} placeholder="เช่น เลือกเนื้อสัตว์" /></label>
                                <label>ชื่อกลุ่ม (English)<input value={group.nameEn || ''} onChange={event => updateGroup(groupIndex, { nameEn: event.target.value })} placeholder="e.g. Choose protein" /></label>
                                <label>รูปแบบ<select value={group.selectionType} onChange={event => updateGroup(groupIndex, { selectionType: event.target.value, maxSelections: event.target.value === 'SINGLE' ? 1 : Math.max(2, group.maxSelections || 2) })}><option value="SINGLE">เลือก 1 รายการ</option><option value="MULTIPLE">เลือกได้หลายรายการ</option></select></label>
                                {group.selectionType === 'MULTIPLE' && <label>เลือกสูงสุด<input type="number" min="1" max={Math.max(1, group.options.length)} value={group.maxSelections} onChange={event => updateGroup(groupIndex, { maxSelections: Math.max(1, Number(event.target.value) || 1) })} /></label>}
                                <label className="admin-option-check"><input type="checkbox" checked={group.isRequired !== false} onChange={event => updateGroup(groupIndex, { isRequired: event.target.checked, minSelections: event.target.checked ? 1 : 0 })} /> จำเป็นต้องเลือก</label>
                                <button type="button" className="admin-option-remove-group" onClick={() => setGroups(current => current.filter((_, index) => index !== groupIndex))}><i className="bi bi-trash3" /> ลบกลุ่ม</button>
                            </div>
                            <div className="admin-option-table-wrap">
                                <table className="admin-option-table">
                                    <thead><tr><th>ลำดับ</th><th>ชื่อตัวเลือก (ไทย) *</th><th>English</th><th>ราคาเพิ่ม</th><th>วัตถุดิบที่ตัด</th><th>จำนวน</th><th>ค่าเริ่มต้น</th><th></th></tr></thead>
                                    <tbody>{group.options.map((option, optionIndex) => {
                                        const ingredient = ingredients.find(item => item.id === option.ingredientId)
                                        return <tr key={option.id || optionIndex}>
                                            <td data-label={`ตัวเลือกที่ ${optionIndex + 1}`}><div className="admin-option-sort"><button type="button" aria-label="เลื่อนขึ้น" disabled={optionIndex === 0} onClick={() => move(groupIndex, optionIndex, -1)}><i className="bi bi-chevron-up" /></button><button type="button" aria-label="เลื่อนลง" disabled={optionIndex === group.options.length - 1} onClick={() => move(groupIndex, optionIndex, 1)}><i className="bi bi-chevron-down" /></button></div></td>
                                            <td data-label="ชื่อตัวเลือก (ไทย) *"><input value={option.name} onChange={event => updateOption(groupIndex, optionIndex, { name: event.target.value })} placeholder="เช่น หมูกรอบ" /></td>
                                            <td data-label="English"><input value={option.nameEn || ''} onChange={event => updateOption(groupIndex, optionIndex, { nameEn: event.target.value })} placeholder="Crispy pork" /></td>
                                            <td data-label="ราคาเพิ่ม"><div className="admin-option-price"><span>+</span><input type="number" min="0" step="1" value={option.priceAdjustment} onChange={event => updateOption(groupIndex, optionIndex, { priceAdjustment: Math.max(0, Number(event.target.value) || 0) })} /><span>฿</span></div></td>
                                            <td data-label="วัตถุดิบที่ตัด"><select value={option.ingredientId || ''} onChange={event => updateOption(groupIndex, optionIndex, { ingredientId: event.target.value, ingredientQuantity: event.target.value ? option.ingredientQuantity : '' })}><option value="">ไม่ผูกวัตถุดิบ</option>{ingredients.map(item => <option key={item.id} value={item.id}>{item.name}{item.nameEn ? ` (${item.nameEn})` : ''}</option>)}</select></td>
                                            <td data-label="จำนวนที่ตัด"><div className="admin-option-quantity"><input type="number" min="0" step="0.001" disabled={!option.ingredientId} value={option.ingredientQuantity ?? ''} onChange={event => updateOption(groupIndex, optionIndex, { ingredientQuantity: event.target.value })} /><span>{ingredient?.unit || '—'}</span></div></td>
                                            <td data-label="เลือกเป็นค่าเริ่มต้น"><input aria-label="เลือกเป็นค่าเริ่มต้น" className="admin-option-default" type={group.selectionType === 'SINGLE' ? 'radio' : 'checkbox'} name={`default-${groupIndex}`} checked={Boolean(option.isDefault)} onChange={event => setDefault(groupIndex, optionIndex, event.target.checked)} /></td>
                                            <td data-label="ลบตัวเลือก"><button type="button" aria-label="ลบตัวเลือก" className="admin-option-delete" disabled={group.options.length === 1} onClick={() => removeOption(groupIndex, optionIndex)}><i className="bi bi-trash3" /></button></td>
                                        </tr>
                                    })}</tbody>
                                </table>
                            </div>
                            <button type="button" className="admin-option-add-choice" onClick={() => addOption(groupIndex)}><i className="bi bi-plus-circle" /> เพิ่มตัวเลือก</button>
                        </article>
                    ))}
                    <button type="button" className="admin-option-add-group" onClick={() => setGroups(current => [...current, newGroup()])}><i className="bi bi-plus-lg" /> เพิ่มกลุ่มตัวเลือก</button>
                </div>
                <footer><button type="button" className="admin-secondary" onClick={requestClose}>ยกเลิก</button><button type="button" className="admin-primary" disabled={saving} onClick={() => onSave(groups)}>{saving ? <><i className="bi bi-arrow-repeat spin" /> กำลังบันทึก...</> : <><i className="bi bi-check2-circle" /> บันทึกตัวเลือก</>}</button></footer>
            </section>
        </div>
        {confirmDialog}
        </>
    )
}
