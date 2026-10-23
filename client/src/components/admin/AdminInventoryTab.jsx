import { useEffect, useMemo, useState } from 'react'
import { adminApi, parseProductDescription } from '../../lib/database'
import { PageHead, useAdminConfirm } from './AdminShared'

const mapIngredient = item => ({
    id: item.id,
    ingredientName: item.name,
    ingredientNameEn: item.nameEn || '',
    categoryId: item.categoryId,
    categoryName: item.category?.name || 'อื่น ๆ',
    categorySortOrder: Number(item.category?.sortOrder || 999),
    quantity: Number(item.quantity),
    unit: item.unit,
    lowThreshold: Number(item.lowThreshold || 0),
    expiration: item.expiresAt || null,
    recipeCount: item.recipeItems?.length || 0,
})

export function AdminInventoryTab({ inventory, setInventory, setProducts, notify, fail }) {
    const [mode, setMode] = useState('ingredients')
    const [categories, setCategories] = useState([])
    const [recipes, setRecipes] = useState([])
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [recipeProductId, setRecipeProductId] = useState('')
    const [recipeDraft, setRecipeDraft] = useState([])
    const [isCreatingRecipe, setIsCreatingRecipe] = useState(false)
    const [recipeNameTh, setRecipeNameTh] = useState('')
    const [recipeNameEn, setRecipeNameEn] = useState('')
    const [ingredientPaletteCategoryId, setIngredientPaletteCategoryId] = useState('')
    const [draggedIngredientId, setDraggedIngredientId] = useState(null)
    const [isRecipeDropActive, setIsRecipeDropActive] = useState(false)
    const [savingRecipe, setSavingRecipe] = useState(false)
    const [isAddingCategory, setIsAddingCategory] = useState(false)
    const [isAddingIngredient, setIsAddingIngredient] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [inventorySearch, setInventorySearch] = useState('')
    const { confirm, confirmDialog } = useAdminConfirm()

    const loadRecipeData = async () => {
        try {
            const [categoryResult, recipeResult] = await Promise.all([
                adminApi.ingredientCategories(),
                adminApi.recipes(),
            ])
            setCategories(categoryResult)
            setRecipes(recipeResult)
            setRecipeProductId(current => {
                if (current && recipeResult.some(recipe => recipe.id === current)) return current
                return recipeResult.find(recipe => recipe.recipeItems?.length)?.id || ''
            })
        } catch (error) {
            fail(error)
        }
    }

    useEffect(() => { loadRecipeData() }, [])

    useEffect(() => {
        if (isCreatingRecipe) return
        const selected = recipes.find(recipe => recipe.id === recipeProductId)
        setRecipeDraft((selected?.recipeItems || []).map(item => ({
            ingredientId: item.ingredientId,
            categoryId: item.ingredient?.categoryId || '',
            quantityRequired: Number(item.quantityRequired),
        })))
    }, [recipeProductId, recipes, isCreatingRecipe])

    useEffect(() => {
        if (ingredientPaletteCategoryId && categories.some(category => category.id === ingredientPaletteCategoryId)) return
        const firstCategoryWithIngredients = categories.find(category => inventory.some(item => item.categoryId === category.id))
        setIngredientPaletteCategoryId(firstCategoryWithIngredients?.id || categories[0]?.id || '')
    }, [categories, inventory, ingredientPaletteCategoryId])

    const groupedInventory = useMemo(() => {
        const normalizedSearch = inventorySearch.trim().toLowerCase()
        const filtered = inventory.filter(item => {
            const matchesCategory = categoryFilter === 'all' || item.categoryId === categoryFilter
            const matchesSearch = !normalizedSearch || `${item.ingredientName || ''} ${item.ingredientNameEn || ''}`.toLowerCase().includes(normalizedSearch)
            return matchesCategory && matchesSearch
        })
        const groups = new Map()
        filtered.forEach(item => {
            const key = item.categoryName || 'อื่น ๆ'
            if (!groups.has(key)) groups.set(key, { name: key, sortOrder: item.categorySortOrder || 999, items: [] })
            groups.get(key).items.push(item)
        })
        return [...groups.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'th'))
    }, [inventory, categoryFilter, inventorySearch])

    const addCategory = async event => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        setIsAddingCategory(true)
        try {
            const created = await adminApi.createIngredientCategory({ name: form.get('categoryName'), nameEn: form.get('categoryNameEn') })
            setCategories(current => [...current, created])
            event.currentTarget.reset()
        } catch (error) {
            fail(error)
        } finally {
            setIsAddingCategory(false)
        }
    }

    const addInventory = async event => {
        event.preventDefault()
        const formElement = event.currentTarget
        const form = new FormData(formElement)
        setIsAddingIngredient(true)
        try {
            const created = await adminApi.createIngredient({
                categoryId: form.get('categoryId'),
                name: String(form.get('nameTh') || '').trim(),
                nameEn: String(form.get('nameEn') || '').trim(),
                quantity: Number(form.get('quantity') || 0),
                unit: String(form.get('unit') || 'g').trim(),
                lowThreshold: Number(form.get('lowThreshold') || 0),
                expiresAt: form.get('expiresAt') || null,
            })
            setInventory(current => [mapIngredient(created), ...current])
            formElement.reset()
            notify('เพิ่มวัตถุดิบเข้าคลังเรียบร้อยแล้ว')
        } catch (error) {
            fail(error)
        } finally {
            setIsAddingIngredient(false)
        }
    }

    const updateInventory = async (id, changes) => {
        try {
            const updated = await adminApi.updateInventory(id, changes)
            setInventory(current => current.map(item => item.id === id ? mapIngredient(updated) : item))
        } catch (error) {
            fail(error)
        }
    }

    const deleteInventory = async item => {
        if (!await confirm(`ต้องการลบวัตถุดิบ “${item.ingredientName}” หรือไม่?`, { confirmLabel: 'ลบวัตถุดิบ' })) return
        setDeletingId(item.id)
        try {
            await adminApi.deleteIngredient(item.id)
            setInventory(current => current.filter(currentItem => currentItem.id !== item.id))
        } catch (error) {
            fail(error)
        } finally {
            setDeletingId(null)
        }
    }

    const addRecipeRow = () => {
        const firstAvailable = inventory.find(item => item.categoryId === ingredientPaletteCategoryId && !recipeDraft.some(row => row.ingredientId === item.id))
            || inventory.find(item => !recipeDraft.some(row => row.ingredientId === item.id))
        if (!firstAvailable) return notify?.('วัตถุดิบทั้งหมดถูกเพิ่มในสูตรแล้ว')
        setRecipeDraft(current => [...current, { categoryId: firstAvailable.categoryId, ingredientId: firstAvailable.id, quantityRequired: 1 }])
    }

    const addIngredientToRecipe = ingredientId => {
        if (recipeDraft.some(row => row.ingredientId === ingredientId)) {
            notify?.('วัตถุดิบนี้อยู่ในสูตรแล้ว')
            return
        }
        const ingredient = inventory.find(item => item.id === ingredientId)
        if (!ingredient) return
        setRecipeDraft(current => [...current, {
            categoryId: ingredient.categoryId,
            ingredientId: ingredient.id,
            quantityRequired: 1,
        }])
    }

    const startIngredientDrag = (event, ingredientId) => {
        setDraggedIngredientId(ingredientId)
        event.dataTransfer.effectAllowed = 'copy'
        event.dataTransfer.setData('text/plain', ingredientId)
        event.dataTransfer.setData('application/x-limeleaf-ingredient', ingredientId)
    }

    const dropIngredientIntoRecipe = event => {
        event.preventDefault()
        const ingredientId = event.dataTransfer.getData('application/x-limeleaf-ingredient') || event.dataTransfer.getData('text/plain')
        setDraggedIngredientId(null)
        setIsRecipeDropActive(false)
        if (ingredientId) addIngredientToRecipe(ingredientId)
    }

    const updateRecipeRow = (index, changes) => setRecipeDraft(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...changes } : row))
    const updateRecipeCategory = (index, categoryId) => {
        const usedIds = new Set(recipeDraft.filter((_, rowIndex) => rowIndex !== index).map(row => row.ingredientId))
        const firstAvailable = inventory.find(item => item.categoryId === categoryId && !usedIds.has(item.id))
        updateRecipeRow(index, { categoryId, ingredientId: firstAvailable?.id || '' })
    }
    const removeRecipeRow = index => setRecipeDraft(current => current.filter((_, rowIndex) => rowIndex !== index))

    const availableRecipeProducts = useMemo(
        () => recipes.filter(recipe => !recipe.recipeItems?.length),
        [recipes],
    )
    const configuredRecipes = useMemo(
        () => recipes.filter(recipe => recipe.recipeItems?.length),
        [recipes],
    )
    const paletteIngredients = useMemo(
        () => inventory.filter(item => item.categoryId === ingredientPaletteCategoryId),
        [inventory, ingredientPaletteCategoryId],
    )

    const chooseNewRecipeProduct = productId => {
        const product = recipes.find(recipe => recipe.id === productId)
        setRecipeProductId(productId)
        setRecipeNameTh(product?.name || '')
        setRecipeNameEn(parseProductDescription(product?.description).en || '')
    }

    const beginCreateRecipe = () => {
        const firstAvailable = availableRecipeProducts[0]
        if (!firstAvailable) {
            notify?.('สินค้าทุกเมนูมีสูตรอาหารแล้ว')
            return
        }
        setIsCreatingRecipe(true)
        setRecipeDraft([])
        chooseNewRecipeProduct(firstAvailable.id)
    }

    const cancelCreateRecipe = () => {
        setIsCreatingRecipe(false)
        const fallbackId = configuredRecipes[0]?.id || ''
        setRecipeProductId(fallbackId)
        const selected = recipes.find(recipe => recipe.id === fallbackId)
        setRecipeDraft((selected?.recipeItems || []).map(item => ({
            ingredientId: item.ingredientId,
            categoryId: item.ingredient?.categoryId || '',
            quantityRequired: Number(item.quantityRequired),
        })))
    }

    const saveRecipe = async () => {
        if (!recipeProductId) return
        if (isCreatingRecipe && !recipeNameTh.trim()) {
            notify('กรุณาระบุชื่อสูตรอาหารภาษาไทย')
            return
        }
        if (recipeDraft.length === 0 || recipeDraft.some(row => !row.ingredientId || Number(row.quantityRequired) <= 0)) {
            notify('กรุณาเพิ่มวัตถุดิบและระบุปริมาณที่มากกว่า 0 อย่างน้อย 1 รายการ')
            return
        }
        if (new Set(recipeDraft.map(row => row.ingredientId)).size !== recipeDraft.length) {
            notify('วัตถุดิบในสูตรซ้ำกัน กรุณารวมเป็นรายการเดียว')
            return
        }
        setSavingRecipe(true)
        try {
            const details = isCreatingRecipe ? { name: recipeNameTh.trim(), nameEn: recipeNameEn.trim() } : {}
            await adminApi.updateRecipe(recipeProductId, recipeDraft, details)
            if (isCreatingRecipe) {
                setProducts?.(current => current.map(product => product.id === recipeProductId
                    ? { ...product, name: recipeNameTh.trim(), en: recipeNameEn.trim() }
                    : product))
            }
            await loadRecipeData()
            const inventoryResult = await adminApi.inventory()
            setInventory(inventoryResult.map(mapIngredient))
            setIsCreatingRecipe(false)
            notify(isCreatingRecipe ? 'เพิ่มสูตรอาหารเรียบร้อยแล้ว' : 'บันทึกสูตรอาหารเรียบร้อยแล้ว')
        } catch (error) {
            fail(error)
        } finally {
            setSavingRecipe(false)
        }
    }

    const selectedRecipe = recipes.find(recipe => recipe.id === recipeProductId)

    return (
        <>
            <PageHead eyebrow="INGREDIENTS & RECIPES" title="วัตถุดิบและสูตรอาหาร" description="จัดการคลังวัตถุดิบแยกหมวดหมู่ และกำหนดปริมาณที่ใช้ต่อเมนู 1 จาน" />

            <div className="admin-inventory-mode-tabs">
                <button className={mode === 'ingredients' ? 'active' : ''} onClick={() => setMode('ingredients')}><i className="bi bi-basket2" /> คลังวัตถุดิบ</button>
                <button className={mode === 'recipes' ? 'active' : ''} onClick={() => setMode('recipes')}><i className="bi bi-journal-text" /> สูตรอาหาร</button>
            </div>

            {mode === 'ingredients' && <>
                <form className="admin-inline-category-form" onSubmit={addCategory}>
                    <b>เพิ่มหมวดวัตถุดิบ</b>
                    <input name="categoryName" required placeholder="เช่น เนื้อสัตว์" />
                    <input name="categoryNameEn" placeholder="Meat & Seafood" />
                    <button className="admin-secondary" disabled={isAddingCategory}>
                        {isAddingCategory ? <><i className="bi bi-arrow-repeat spin me-1" />เพิ่ม...</> : '+ เพิ่มหมวด'}
                    </button>
                </form>

                <form className="admin-grid-form stock admin-ingredient-form" onSubmit={addInventory}>
                    <label>หมวดหมู่ *
                        <select name="categoryId" required defaultValue="">
                            <option value="" disabled>เลือกหมวดวัตถุดิบ</option>
                            {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                        </select>
                    </label>
                    <label>ชื่อวัตถุดิบ (ไทย) *<input name="nameTh" required placeholder="เช่น อกไก่ / ใบกะเพรา" /></label>
                    <label>ชื่อภาษาอังกฤษ<input name="nameEn" placeholder="Chicken Breast / Holy Basil" /></label>
                    <label>จำนวนคงเหลือ<input name="quantity" required type="number" min="0" step="0.001" defaultValue="0" /></label>
                    <label>หน่วยนับ
                        <select name="unit" defaultValue="g"><option>g</option><option>kg</option><option>ml</option><option>L</option><option>ชิ้น</option><option>ฟอง</option><option>แพ็ค</option></select>
                    </label>
                    <label>แจ้งเตือนเมื่อเหลือต่ำกว่า<input name="lowThreshold" required type="number" min="0" step="0.001" defaultValue="10" /></label>
                    <label>วันหมดอายุ<input name="expiresAt" type="date" /></label>
                    <button className="admin-primary" disabled={isAddingIngredient}>
                        {isAddingIngredient ? <><i className="bi bi-arrow-repeat spin me-1" />กำลังเพิ่ม...</> : '+ เพิ่มวัตถุดิบ'}
                    </button>
                </form>

                <section className="admin-panel">
                    <div className="admin-panel-toolbar">
                        <b>รายการวัตถุดิบทั้งหมด</b>
                        <div className="admin-panel-toolbar-filters admin-inventory-filters">
                            <label className="admin-list-search"><i className="bi bi-search" /><input value={inventorySearch} onChange={event => setInventorySearch(event.target.value)} placeholder="ค้นหาวัตถุดิบ..." /></label>
                            <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}>
                                <option value="all">ทุกหมวดหมู่</option>
                                {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="admin-table-wrap">
                        <table className="admin-responsive-table admin-inventory-table">
                            <thead><tr><th>วัตถุดิบ</th><th>คงเหลือ</th><th>จุดแจ้งเตือน</th><th>ใช้ในสูตร</th><th>ปรับจำนวน</th><th></th></tr></thead>
                            <tbody>
                                {groupedInventory.map(group => [
                                    <tr className="admin-ingredient-category-row" key={`category-${group.name}`}><td colSpan={6}><i className="bi bi-grid-fill" /> {group.name} <small>{group.items.length} รายการ</small></td></tr>,
                                    ...group.items.map(item => {
                                        const isLow = item.quantity <= item.lowThreshold
                                        return <tr key={item.id}>
                                            <td data-label="วัตถุดิบ"><b>{item.ingredientName}</b>{item.ingredientNameEn && <small className="admin-cell-subtitle">{item.ingredientNameEn}</small>}</td>
                                            <td data-label="คงเหลือ"><strong className={isLow ? 'admin-stock-low' : ''}>{item.quantity.toLocaleString()} {item.unit}</strong></td>
                                            <td data-label="จุดแจ้งเตือน">{item.lowThreshold.toLocaleString()} {item.unit}</td>
                                            <td data-label="ใช้ในสูตร">{item.recipeCount || 0} เมนู</td>
                                            <td data-label="ปรับจำนวน"><div className="admin-stepper"><button type="button" onClick={() => updateInventory(item.id, { quantity: Math.max(0, item.quantity - 1) })}>−</button><span>{item.quantity}</span><button type="button" onClick={() => updateInventory(item.id, { quantity: item.quantity + 1 })}>+</button></div></td>
                                            <td data-label="การจัดการ">
                                                <button type="button" className="admin-text-danger" disabled={deletingId === item.id} onClick={() => deleteInventory(item)}>
                                                    {deletingId === item.id ? <><i className="bi bi-arrow-repeat spin me-1" />ลบ...</> : 'ลบ'}
                                                </button>
                                            </td>
                                        </tr>
                                    }),
                                ])}
                            </tbody>
                        </table>
                    </div>
                </section>
            </>}

            {mode === 'recipes' && <section className="admin-panel admin-recipe-panel">
                <div className="admin-recipe-head">
                    <div>
                        <small>{isCreatingRecipe ? 'สร้างสูตรใหม่' : 'สูตรต่อ 1 จาน'}</small>
                        <h3>{isCreatingRecipe ? 'เพิ่มสูตรอาหาร' : (selectedRecipe?.name || 'ยังไม่มีสูตรอาหาร')}</h3>
                    </div>
                    <div className="admin-recipe-head-actions">
                        {!isCreatingRecipe && <select value={recipeProductId} onChange={event => setRecipeProductId(event.target.value)} disabled={!configuredRecipes.length}>
                            {!configuredRecipes.length && <option value="">ยังไม่มีสูตรอาหาร</option>}
                            {configuredRecipes.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                        </select>}
                        {!isCreatingRecipe && <button type="button" className="admin-primary" onClick={beginCreateRecipe}>
                            <i className="bi bi-plus-circle" /> เพิ่มสูตรอาหาร
                        </button>}
                    </div>
                </div>

                {isCreatingRecipe && <div className="admin-recipe-create-fields">
                    <label>เมนูสินค้าที่ต้องการสร้างสูตร *
                        <select value={recipeProductId} onChange={event => chooseNewRecipeProduct(event.target.value)}>
                            {availableRecipeProducts.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                        </select>
                    </label>
                    <label>ชื่อสูตรอาหาร (ภาษาไทย) *
                        <input value={recipeNameTh} onChange={event => setRecipeNameTh(event.target.value)} placeholder="เช่น ข้าวกะเพราไก่กรอบ" />
                    </label>
                    <label>ชื่อสูตรอาหาร (English)
                        <input value={recipeNameEn} onChange={event => setRecipeNameEn(event.target.value)} placeholder="e.g. Crispy Basil Chicken Rice" />
                    </label>
                </div>}

                <div className="admin-recipe-ingredient-picker">
                    <div className="admin-recipe-picker-head">
                        <label>
                            <span>เลือกหมวดหมู่วัตถุดิบ</span>
                            <select value={ingredientPaletteCategoryId} onChange={event => setIngredientPaletteCategoryId(event.target.value)}>
                                {categories.map(category => <option key={category.id} value={category.id}>{category.name}{category.nameEn ? ` (${category.nameEn})` : ''}</option>)}
                            </select>
                        </label>
                        <p><i className="bi bi-hand-index-thumb" /> ลากการ์ดลงรายการสูตรด้านล่าง หรือคลิกเพื่อเพิ่ม</p>
                    </div>
                    <div className="admin-recipe-ingredient-palette">
                        {paletteIngredients.length === 0 ? (
                            <span className="admin-recipe-palette-empty">ยังไม่มีวัตถุดิบในหมวดหมู่นี้</span>
                        ) : paletteIngredients.map(ingredient => {
                            const isAdded = recipeDraft.some(row => row.ingredientId === ingredient.id)
                            return (
                                <button
                                    type="button"
                                    className={`admin-recipe-ingredient-card ${isAdded ? 'is-added' : ''} ${draggedIngredientId === ingredient.id ? 'is-dragging' : ''}`}
                                    key={ingredient.id}
                                    draggable={!isAdded}
                                    disabled={isAdded}
                                    onDragStart={event => startIngredientDrag(event, ingredient.id)}
                                    onDragEnd={() => { setDraggedIngredientId(null); setIsRecipeDropActive(false) }}
                                    onClick={() => addIngredientToRecipe(ingredient.id)}
                                >
                                    <span className="admin-recipe-ingredient-card-icon"><i className="bi bi-basket2-fill" /></span>
                                    <span className="admin-recipe-ingredient-card-copy">
                                        <strong>{ingredient.ingredientName}</strong>
                                        <small>{ingredient.ingredientNameEn || `${ingredient.quantity.toLocaleString()} ${ingredient.unit}`}</small>
                                    </span>
                                    {isAdded && <i className="bi bi-check-circle-fill admin-recipe-ingredient-added" />}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div
                    className={`admin-recipe-list admin-recipe-drop-zone ${isRecipeDropActive ? 'is-drag-over' : ''}`}
                    onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setIsRecipeDropActive(true) }}
                    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setIsRecipeDropActive(false) }}
                    onDrop={dropIngredientIntoRecipe}
                >
                    {recipeDraft.length === 0 && <div className="admin-recipe-empty admin-recipe-drop-empty"><i className="bi bi-box-arrow-in-down" /><b>ลากวัตถุดิบมาวางที่นี่</b><span>หรือคลิกการ์ดวัตถุดิบด้านบนเพื่อเพิ่มในสูตร</span></div>}
                    {recipeDraft.map((row, index) => {
                        const ingredient = inventory.find(item => item.id === row.ingredientId)
                        const ingredientOptions = inventory.filter(item => item.categoryId === row.categoryId)
                        return <div className="admin-recipe-row" key={`${row.ingredientId}-${index}`}>
                            <select aria-label={`หมวดหมู่วัตถุดิบรายการที่ ${index + 1}`} value={row.categoryId || ''} onChange={event => updateRecipeCategory(index, event.target.value)}>
                                <option value="" disabled>เลือกหมวดหมู่</option>
                                {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                            </select>
                            <select value={row.ingredientId} onChange={event => updateRecipeRow(index, { ingredientId: event.target.value })}>
                                <option value="" disabled>เลือกวัตถุดิบ</option>
                                {ingredientOptions.map(item => <option key={item.id} value={item.id}>{item.ingredientName}{item.ingredientNameEn ? ` (${item.ingredientNameEn})` : ''}</option>)}
                            </select>
                            <input type="number" min="0.001" step="0.001" value={row.quantityRequired} onChange={event => updateRecipeRow(index, { quantityRequired: Number(event.target.value) })} />
                            <span>{ingredient?.unit || 'หน่วย'}</span>
                            <button type="button" onClick={() => removeRecipeRow(index)}><i className="bi bi-trash" /></button>
                        </div>
                    })}
                </div>
                <div className="admin-recipe-actions">
                    <button type="button" className="admin-secondary" onClick={addRecipeRow} disabled={!recipeProductId}>+ เพิ่มวัตถุดิบ</button>
                    <div className="admin-recipe-save-actions">
                        {isCreatingRecipe && <button type="button" className="admin-secondary" onClick={cancelCreateRecipe} disabled={savingRecipe}>ยกเลิก</button>}
                        <button type="button" className="admin-primary" onClick={saveRecipe} disabled={!recipeProductId || savingRecipe}>
                            {savingRecipe ? <><i className="bi bi-arrow-repeat spin me-1" />กำลังบันทึก...</> : (isCreatingRecipe ? 'เพิ่มสูตรอาหาร' : 'บันทึกสูตรอาหาร')}
                        </button>
                    </div>
                </div>
            </section>}
            {confirmDialog}
        </>
    )
}
