import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../lib/database'

const mapIngredient = item => ({
    id: item.id,
    ingredientName: item.name || 'วัตถุดิบทั่วไป',
    ingredientNameEn: item.nameEn || '',
    categoryId: item.categoryId,
    categoryName: item.category?.name || 'อื่น ๆ',
    categorySortOrder: Number(item.category?.sortOrder || 999),
    quantity: Number(item.quantity),
    unit: item.unit || 'หน่วย',
    lowThreshold: Number(item.lowThreshold || 0),
    recipeCount: item.recipeItems?.length || 0,
})

export function KitchenRecipesTab({ inventory, setInventory }) {
    const [recipes, setRecipes] = useState([])
    const [selectedProductId, setSelectedProductId] = useState('')
    const [draft, setDraft] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const loadRecipes = useCallback(async () => {
        setLoading(true)
        try {
            const result = await adminApi.recipes()
            setRecipes(result || [])
            setSelectedProductId(current => current || result?.[0]?.id || '')
        } catch (error) {
            window.alert('ไม่สามารถโหลดสูตรอาหารได้: ' + error.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadRecipes() }, [loadRecipes])

    useEffect(() => {
        const selected = recipes.find(recipe => recipe.id === selectedProductId)
        setDraft((selected?.recipeItems || []).map(item => ({
            ingredientId: item.ingredientId,
            quantityRequired: Number(item.quantityRequired),
        })))
    }, [selectedProductId, recipes])

    const sortedInventory = useMemo(() => [...inventory].sort((a, b) =>
        (a.categorySortOrder || 999) - (b.categorySortOrder || 999)
        || (a.categoryName || '').localeCompare(b.categoryName || '', 'th')
        || (a.ingredientName || '').localeCompare(b.ingredientName || '', 'th')
    ), [inventory])

    const selectedRecipe = recipes.find(recipe => recipe.id === selectedProductId)

    const estimatedServings = useMemo(() => {
        if (!draft.length) return 0
        const estimates = draft.map(row => {
            const ingredient = inventory.find(item => item.id === row.ingredientId)
            const required = Number(row.quantityRequired || 0)
            if (!ingredient || required <= 0) return 0
            return Math.floor(Number(ingredient.quantity || 0) / required)
        })
        return Math.max(0, Math.min(...estimates))
    }, [draft, inventory])

    const addRecipeRow = () => {
        const firstAvailable = sortedInventory.find(item => !draft.some(row => row.ingredientId === item.id))
        if (!firstAvailable) {
            window.alert(inventory.length ? 'วัตถุดิบทั้งหมดถูกเพิ่มในสูตรแล้ว' : 'ยังไม่มีวัตถุดิบในคลัง')
            return
        }
        setDraft(current => [...current, { ingredientId: firstAvailable.id, quantityRequired: 1 }])
    }

    const updateRecipeRow = (index, changes) => {
        setDraft(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...changes } : row))
    }

    const removeRecipeRow = index => setDraft(current => current.filter((_, rowIndex) => rowIndex !== index))

    const saveRecipe = async () => {
        if (!selectedProductId) return
        if (draft.some(row => !row.ingredientId || Number(row.quantityRequired) <= 0)) {
            window.alert('กรุณาระบุวัตถุดิบและปริมาณที่มากกว่า 0 ให้ครบทุกรายการ')
            return
        }
        if (new Set(draft.map(row => row.ingredientId)).size !== draft.length) {
            window.alert('มีวัตถุดิบซ้ำในสูตร กรุณารวมเป็นรายการเดียว')
            return
        }

        setSaving(true)
        try {
            await adminApi.updateRecipe(selectedProductId, draft)
            const [recipeResult, inventoryResult] = await Promise.all([
                adminApi.recipes(),
                adminApi.inventory(),
            ])
            setRecipes(recipeResult || [])
            setInventory((inventoryResult || []).map(mapIngredient))
            window.alert('บันทึกสูตรอาหารเรียบร้อยแล้ว')
        } catch (error) {
            window.alert('ไม่สามารถบันทึกสูตรอาหารได้: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <section>
            <div className="staff-section-head kitchen-recipe-page-head">
                <div>
                    <h2>จัดการสูตรเมนูอาหาร (Menu Recipes)</h2>
                    <p>กำหนดวัตถุดิบและปริมาณที่ใช้สำหรับเมนู 1 จาน ระบบจะนำสูตรไปตัดสต๊อกเมื่อมีออเดอร์</p>
                </div>
                <button type="button" className="staff-secondary kitchen-recipe-refresh" onClick={loadRecipes} disabled={loading}>
                    <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`} /> รีเฟรชสูตร
                </button>
            </div>

            <div className="kitchen-recipe-shell">
                <div className="kitchen-recipe-toolbar">
                    <label>
                        <span>เลือกเมนูอาหาร</span>
                        <select value={selectedProductId} onChange={event => setSelectedProductId(event.target.value)} disabled={loading || !recipes.length}>
                            {!recipes.length && <option value="">ไม่มีเมนูอาหาร</option>}
                            {recipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}
                        </select>
                    </label>
                    <div className="kitchen-recipe-summary">
                        <span><i className="bi bi-basket2" /><b>{draft.length}</b> วัตถุดิบในสูตร</span>
                        <span><i className="bi bi-egg-fried" />ทำได้ประมาณ <b>{estimatedServings.toLocaleString()}</b> จาน</span>
                    </div>
                </div>

                <div className="kitchen-recipe-titlebar">
                    <div>
                        <small>สูตรต่อ 1 จาน</small>
                        <h3>{selectedRecipe?.name || 'กรุณาเลือกเมนู'}</h3>
                    </div>
                    <span className="kitchen-recipe-hint"><i className="bi bi-info-circle" /> ปริมาณต้องใช้หน่วยเดียวกับสต๊อก</span>
                </div>

                <div className="kitchen-recipe-list">
                    {loading ? (
                        <div className="kitchen-recipe-empty"><i className="bi bi-arrow-repeat spin" /> กำลังโหลดสูตรอาหาร...</div>
                    ) : draft.length === 0 ? (
                        <div className="kitchen-recipe-empty">
                            <i className="bi bi-journal-plus" />
                            <b>เมนูนี้ยังไม่มีสูตรวัตถุดิบ</b>
                            <span>กด “เพิ่มวัตถุดิบในสูตร” เพื่อเริ่มกำหนดสูตร</span>
                        </div>
                    ) : (
                        draft.map((row, index) => {
                            const ingredient = inventory.find(item => item.id === row.ingredientId)
                            return (
                                <div className="kitchen-recipe-row" key={`${row.ingredientId}-${index}`}>
                                    <span className="kitchen-recipe-index">{index + 1}</span>
                                    <label className="kitchen-recipe-ingredient">
                                        <span>วัตถุดิบ</span>
                                        <select value={row.ingredientId} onChange={event => updateRecipeRow(index, { ingredientId: event.target.value })}>
                                            {sortedInventory.map(item => (
                                                <option key={item.id} value={item.id}>{item.categoryName} · {item.ingredientName}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="kitchen-recipe-quantity">
                                        <span>ปริมาณต่อจาน</span>
                                        <div><input type="number" min="0.001" step="0.001" value={row.quantityRequired} onChange={event => updateRecipeRow(index, { quantityRequired: Number(event.target.value) })} /><b>{ingredient?.unit || 'หน่วย'}</b></div>
                                    </label>
                                    <div className="kitchen-recipe-stock">
                                        <span>คงเหลือ</span>
                                        <b>{Number(ingredient?.quantity || 0).toLocaleString()} {ingredient?.unit || ''}</b>
                                    </div>
                                    <button type="button" className="kitchen-recipe-remove" onClick={() => removeRecipeRow(index)} title="นำวัตถุดิบออกจากสูตร"><i className="bi bi-trash3" /></button>
                                </div>
                            )
                        })
                    )}
                </div>

                <div className="kitchen-recipe-actions">
                    <button type="button" className="staff-secondary" onClick={addRecipeRow} disabled={!selectedProductId || loading}>
                        <i className="bi bi-plus-circle" /> เพิ่มวัตถุดิบในสูตร
                    </button>
                    <button type="button" className="kitchen-recipe-save" onClick={saveRecipe} disabled={!selectedProductId || loading || saving}>
                        <i className={`bi ${saving ? 'bi-hourglass-split' : 'bi-check2-circle'}`} /> {saving ? 'กำลังบันทึก...' : 'บันทึกสูตรอาหาร'}
                    </button>
                </div>
            </div>
        </section>
    )
}
