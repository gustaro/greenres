import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../lib/database'
import { PageHead } from './AdminShared'

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

export function AdminInventoryTab({ inventory, setInventory, products = [], fail }) {
    const [mode, setMode] = useState('ingredients')
    const [categories, setCategories] = useState([])
    const [recipes, setRecipes] = useState([])
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [recipeProductId, setRecipeProductId] = useState('')
    const [recipeDraft, setRecipeDraft] = useState([])
    const [savingRecipe, setSavingRecipe] = useState(false)
    const [isAddingCategory, setIsAddingCategory] = useState(false)
    const [isAddingIngredient, setIsAddingIngredient] = useState(false)
    const [deletingId, setDeletingId] = useState(null)

    const loadRecipeData = async () => {
        try {
            const [categoryResult, recipeResult] = await Promise.all([
                adminApi.ingredientCategories(),
                adminApi.recipes(),
            ])
            setCategories(categoryResult)
            setRecipes(recipeResult)
            if (!recipeProductId && recipeResult[0]) setRecipeProductId(recipeResult[0].id)
        } catch (error) {
            fail(error)
        }
    }

    useEffect(() => { loadRecipeData() }, [])

    useEffect(() => {
        const selected = recipes.find(recipe => recipe.id === recipeProductId)
        setRecipeDraft((selected?.recipeItems || []).map(item => ({
            ingredientId: item.ingredientId,
            quantityRequired: Number(item.quantityRequired),
        })))
    }, [recipeProductId, recipes])

    const groupedInventory = useMemo(() => {
        const filtered = categoryFilter === 'all' ? inventory : inventory.filter(item => item.categoryId === categoryFilter)
        const groups = new Map()
        filtered.forEach(item => {
            const key = item.categoryName || 'อื่น ๆ'
            if (!groups.has(key)) groups.set(key, { name: key, sortOrder: item.categorySortOrder || 999, items: [] })
            groups.get(key).items.push(item)
        })
        return [...groups.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'th'))
    }, [inventory, categoryFilter])

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
            window.alert('เพิ่มวัตถุดิบเข้าคลังเรียบร้อยแล้ว')
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
        if (!window.confirm(`ต้องการลบวัตถุดิบ “${item.ingredientName}” หรือไม่?`)) return
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
        const firstAvailable = inventory.find(item => !recipeDraft.some(row => row.ingredientId === item.id))
        if (!firstAvailable) return
        setRecipeDraft(current => [...current, { ingredientId: firstAvailable.id, quantityRequired: 1 }])
    }

    const updateRecipeRow = (index, changes) => setRecipeDraft(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...changes } : row))
    const removeRecipeRow = index => setRecipeDraft(current => current.filter((_, rowIndex) => rowIndex !== index))

    const saveRecipe = async () => {
        if (!recipeProductId) return
        if (new Set(recipeDraft.map(row => row.ingredientId)).size !== recipeDraft.length) {
            window.alert('วัตถุดิบในสูตรซ้ำกัน กรุณารวมเป็นรายการเดียว')
            return
        }
        setSavingRecipe(true)
        try {
            await adminApi.updateRecipe(recipeProductId, recipeDraft)
            await loadRecipeData()
            const inventoryResult = await adminApi.inventory()
            setInventory(inventoryResult.map(mapIngredient))
            window.alert('บันทึกสูตรอาหารเรียบร้อยแล้ว')
        } catch (error) {
            fail(error)
        } finally {
            setSavingRecipe(false)
        }
    }

    const selectedRecipe = recipes.find(recipe => recipe.id === recipeProductId)
    const recipeProducts = recipes.length ? recipes : products

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
                        <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}>
                            <option value="all">ทุกหมวดหมู่</option>
                            {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                        </select>
                    </div>
                    <div className="admin-table-wrap">
                        <table>
                            <thead><tr><th>วัตถุดิบ</th><th>คงเหลือ</th><th>จุดแจ้งเตือน</th><th>ใช้ในสูตร</th><th>ปรับจำนวน</th><th></th></tr></thead>
                            <tbody>
                                {groupedInventory.map(group => [
                                    <tr className="admin-ingredient-category-row" key={`category-${group.name}`}><td colSpan={6}><i className="bi bi-grid-fill" /> {group.name} <small>{group.items.length} รายการ</small></td></tr>,
                                    ...group.items.map(item => {
                                        const isLow = item.quantity <= item.lowThreshold
                                        return <tr key={item.id}>
                                            <td><b>{item.ingredientName}</b>{item.ingredientNameEn && <small className="admin-cell-subtitle">{item.ingredientNameEn}</small>}</td>
                                            <td><strong className={isLow ? 'admin-stock-low' : ''}>{item.quantity.toLocaleString()} {item.unit}</strong></td>
                                            <td>{item.lowThreshold.toLocaleString()} {item.unit}</td>
                                            <td>{item.recipeCount || 0} เมนู</td>
                                            <td><div className="admin-stepper"><button type="button" onClick={() => updateInventory(item.id, { quantity: Math.max(0, item.quantity - 1) })}>−</button><span>{item.quantity}</span><button type="button" onClick={() => updateInventory(item.id, { quantity: item.quantity + 1 })}>+</button></div></td>
                                            <td>
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
                    <div><small>สูตรต่อ 1 จาน</small><h3>{selectedRecipe?.name || 'เลือกเมนู'}</h3></div>
                    <select value={recipeProductId} onChange={event => setRecipeProductId(event.target.value)}>
                        {recipeProducts.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                    </select>
                </div>
                <div className="admin-recipe-list">
                    {recipeDraft.length === 0 && <p className="admin-recipe-empty">เมนูนี้ยังไม่มีสูตรวัตถุดิบ</p>}
                    {recipeDraft.map((row, index) => {
                        const ingredient = inventory.find(item => item.id === row.ingredientId)
                        return <div className="admin-recipe-row" key={`${row.ingredientId}-${index}`}>
                            <select value={row.ingredientId} onChange={event => updateRecipeRow(index, { ingredientId: event.target.value })}>
                                {inventory.map(item => <option key={item.id} value={item.id}>{item.categoryName} · {item.ingredientName}</option>)}
                            </select>
                            <input type="number" min="0.001" step="0.001" value={row.quantityRequired} onChange={event => updateRecipeRow(index, { quantityRequired: Number(event.target.value) })} />
                            <span>{ingredient?.unit || 'หน่วย'}</span>
                            <button type="button" onClick={() => removeRecipeRow(index)}><i className="bi bi-trash" /></button>
                        </div>
                    })}
                </div>
                <div className="admin-recipe-actions">
                    <button type="button" className="admin-secondary" onClick={addRecipeRow}>+ เพิ่มวัตถุดิบในสูตร</button>
                    <button type="button" className="admin-primary" onClick={saveRecipe} disabled={savingRecipe}>
                        {savingRecipe ? <><i className="bi bi-arrow-repeat spin me-1" />กำลังบันทึก...</> : 'บันทึกสูตรอาหาร'}
                    </button>
                </div>
            </section>}
        </>
    )
}
