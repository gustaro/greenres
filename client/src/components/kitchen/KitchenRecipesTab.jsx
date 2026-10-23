import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminApi, parseProductDescription } from '../../lib/database'

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
    const [isCreatingRecipe, setIsCreatingRecipe] = useState(false)
    const [recipeNameTh, setRecipeNameTh] = useState('')
    const [recipeNameEn, setRecipeNameEn] = useState('')

    const loadRecipes = useCallback(async () => {
        setLoading(true)
        try {
            const result = await adminApi.recipes()
            setRecipes(result || [])
            setSelectedProductId(current => {
                if (current && result?.some(recipe => recipe.id === current)) return current
                return result?.find(recipe => recipe.recipeItems?.length)?.id || ''
            })
        } catch (error) {
            window.alert('ไม่สามารถโหลดสูตรอาหารได้: ' + error.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadRecipes() }, [loadRecipes])

    useEffect(() => {
        if (isCreatingRecipe) return
        const selected = recipes.find(recipe => recipe.id === selectedProductId)
        setDraft((selected?.recipeItems || []).map(item => ({
            ingredientId: item.ingredientId,
            categoryId: item.ingredient?.categoryId || '',
            quantityRequired: Number(item.quantityRequired),
        })))
    }, [selectedProductId, recipes, isCreatingRecipe])

    const sortedInventory = useMemo(() => [...inventory].sort((a, b) =>
        (a.categorySortOrder || 999) - (b.categorySortOrder || 999)
        || (a.categoryName || '').localeCompare(b.categoryName || '', 'th')
        || (a.ingredientName || '').localeCompare(b.ingredientName || '', 'th')
    ), [inventory])

    const ingredientCategories = useMemo(() => {
        const byId = new Map()
        sortedInventory.forEach(item => {
            if (!byId.has(item.categoryId)) byId.set(item.categoryId, { id: item.categoryId, name: item.categoryName, sortOrder: item.categorySortOrder })
        })
        return [...byId.values()]
    }, [sortedInventory])

    const configuredRecipes = useMemo(() => recipes.filter(recipe => recipe.recipeItems?.length), [recipes])
    const availableRecipeProducts = useMemo(() => recipes.filter(recipe => !recipe.recipeItems?.length), [recipes])

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
        setDraft(current => [...current, { categoryId: firstAvailable.categoryId, ingredientId: firstAvailable.id, quantityRequired: 1 }])
    }

    const updateRecipeRow = (index, changes) => {
        setDraft(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...changes } : row))
    }

    const updateRecipeCategory = (index, categoryId) => {
        const usedIds = new Set(draft.filter((_, rowIndex) => rowIndex !== index).map(row => row.ingredientId))
        const firstAvailable = sortedInventory.find(item => item.categoryId === categoryId && !usedIds.has(item.id))
        updateRecipeRow(index, { categoryId, ingredientId: firstAvailable?.id || '' })
    }

    const removeRecipeRow = index => setDraft(current => current.filter((_, rowIndex) => rowIndex !== index))

    const chooseNewRecipeProduct = productId => {
        const product = recipes.find(recipe => recipe.id === productId)
        setSelectedProductId(productId)
        setRecipeNameTh(product?.name || '')
        setRecipeNameEn(parseProductDescription(product?.description).en || '')
    }

    const beginCreateRecipe = () => {
        const firstAvailable = availableRecipeProducts[0]
        if (!firstAvailable) {
            window.alert('สินค้าทุกเมนูมีสูตรอาหารแล้ว')
            return
        }
        setIsCreatingRecipe(true)
        setDraft([])
        chooseNewRecipeProduct(firstAvailable.id)
    }

    const cancelCreateRecipe = () => {
        setIsCreatingRecipe(false)
        const fallbackId = configuredRecipes[0]?.id || ''
        setSelectedProductId(fallbackId)
        const selected = recipes.find(recipe => recipe.id === fallbackId)
        setDraft((selected?.recipeItems || []).map(item => ({
            ingredientId: item.ingredientId,
            categoryId: item.ingredient?.categoryId || '',
            quantityRequired: Number(item.quantityRequired),
        })))
    }

    const saveRecipe = async () => {
        if (!selectedProductId) return
        if (isCreatingRecipe && !recipeNameTh.trim()) {
            window.alert('กรุณาระบุชื่อสูตรอาหารภาษาไทย')
            return
        }
        if (draft.length === 0) {
            window.alert('กรุณาเพิ่มวัตถุดิบในสูตรอย่างน้อย 1 รายการ')
            return
        }
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
            const details = isCreatingRecipe ? { name: recipeNameTh.trim(), nameEn: recipeNameEn.trim() } : {}
            await adminApi.updateRecipe(selectedProductId, draft, details)
            const [recipeResult, inventoryResult] = await Promise.all([
                adminApi.recipes(),
                adminApi.inventory(),
            ])
            setRecipes(recipeResult || [])
            setInventory((inventoryResult || []).map(mapIngredient))
            setIsCreatingRecipe(false)
            window.alert(isCreatingRecipe ? 'เพิ่มสูตรอาหารเรียบร้อยแล้ว' : 'บันทึกสูตรอาหารเรียบร้อยแล้ว')
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
                <div className="kitchen-recipe-page-actions">
                    <button type="button" className="staff-secondary kitchen-recipe-refresh" onClick={loadRecipes} disabled={loading}>
                        <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`} /> รีเฟรชสูตร
                    </button>
                    <button type="button" className="kitchen-recipe-add" onClick={beginCreateRecipe} disabled={loading || isCreatingRecipe}>
                        <i className="bi bi-plus-circle" /> เพิ่มสูตรอาหาร
                    </button>
                </div>
            </div>

            <div className="kitchen-recipe-shell">
                <div className="kitchen-recipe-toolbar">
                    <label>
                        <span>{isCreatingRecipe ? 'เมนูสินค้าที่ต้องการสร้างสูตร' : 'เลือกสูตรอาหาร'}</span>
                        <select
                            value={selectedProductId}
                            onChange={event => isCreatingRecipe ? chooseNewRecipeProduct(event.target.value) : setSelectedProductId(event.target.value)}
                            disabled={loading || (isCreatingRecipe ? !availableRecipeProducts.length : !configuredRecipes.length)}
                        >
                            {isCreatingRecipe
                                ? availableRecipeProducts.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)
                                : <>{!configuredRecipes.length && <option value="">ยังไม่มีสูตรอาหาร</option>}{configuredRecipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</>}
                        </select>
                    </label>
                    <div className="kitchen-recipe-summary">
                        <span><i className="bi bi-basket2" /><b>{draft.length}</b> วัตถุดิบในสูตร</span>
                        <span><i className="bi bi-egg-fried" />ทำได้ประมาณ <b>{estimatedServings.toLocaleString()}</b> จาน</span>
                    </div>
                </div>

                {isCreatingRecipe && <div className="kitchen-recipe-create-fields">
                    <label>
                        <span>ชื่อสูตรอาหาร (ภาษาไทย) *</span>
                        <input value={recipeNameTh} onChange={event => setRecipeNameTh(event.target.value)} placeholder="เช่น ข้าวกะเพราไก่กรอบ" />
                    </label>
                    <label>
                        <span>ชื่อสูตรอาหาร (English)</span>
                        <input value={recipeNameEn} onChange={event => setRecipeNameEn(event.target.value)} placeholder="e.g. Crispy Basil Chicken Rice" />
                    </label>
                </div>}

                <div className="kitchen-recipe-titlebar">
                    <div>
                        <small>สูตรต่อ 1 จาน</small>
                        <h3>{isCreatingRecipe ? (recipeNameTh || 'สูตรอาหารใหม่') : (selectedRecipe?.name || 'กรุณาเลือกสูตรอาหาร')}</h3>
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
                            <span>กด “+ เพิ่มวัตถุดิบ” เพื่อเริ่มกำหนดสูตร</span>
                        </div>
                    ) : (
                        draft.map((row, index) => {
                            const ingredient = inventory.find(item => item.id === row.ingredientId)
                            const ingredientOptions = sortedInventory.filter(item => item.categoryId === row.categoryId)
                            return (
                                <div className="kitchen-recipe-row" key={`${row.ingredientId}-${index}`}>
                                    <span className="kitchen-recipe-index">{index + 1}</span>
                                    <label className="kitchen-recipe-category">
                                        <span>หมวดหมู่</span>
                                        <select value={row.categoryId || ''} onChange={event => updateRecipeCategory(index, event.target.value)}>
                                            <option value="" disabled>เลือกหมวดหมู่</option>
                                            {ingredientCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                                        </select>
                                    </label>
                                    <label className="kitchen-recipe-ingredient">
                                        <span>วัตถุดิบ</span>
                                        <select value={row.ingredientId} onChange={event => updateRecipeRow(index, { ingredientId: event.target.value })}>
                                            <option value="" disabled>เลือกวัตถุดิบ</option>
                                            {ingredientOptions.map(item => (
                                                <option key={item.id} value={item.id}>{item.ingredientName}{item.ingredientNameEn ? ` (${item.ingredientNameEn})` : ''}</option>
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
                        <i className="bi bi-plus-circle" /> + เพิ่มวัตถุดิบ
                    </button>
                    <div className="kitchen-recipe-save-actions">
                        {isCreatingRecipe && <button type="button" className="staff-secondary" onClick={cancelCreateRecipe} disabled={saving}>ยกเลิก</button>}
                        <button type="button" className="kitchen-recipe-save" onClick={saveRecipe} disabled={!selectedProductId || loading || saving}>
                            <i className={`bi ${saving ? 'bi-hourglass-split' : 'bi-check2-circle'}`} /> {saving ? 'กำลังบันทึก...' : (isCreatingRecipe ? 'เพิ่มสูตรอาหาร' : 'บันทึกสูตรอาหาร')}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}
