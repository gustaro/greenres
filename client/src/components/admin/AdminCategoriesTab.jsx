import { catalogApi, mapCategory } from '../../lib/database'
import { PageHead } from './AdminShared'

export function AdminCategoriesTab({ categories, setCategories, products, notify, fail }) {
    const serverCanCreateSlug = name => /[a-z0-9]/i.test(name)

    const addCategory = async event => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        const name = form.get('name').trim()
        if (!name) return
        if (!serverCanCreateSlug(name)) {
            return notify('Server สร้าง slug จาก A-Z/0-9 เท่านั้น กรุณาใส่ตัวอักษรอังกฤษในชื่อประเภทด้วย')
        }
        try {
            const data = await catalogApi.createCategory({ name, sortOrder: categories.length })
            setCategories(current => [...current, mapCategory(data)])
            event.currentTarget.reset()
            notify('เพิ่มประเภทสินค้าแล้ว')
        } catch (error) {
            fail(error)
        }
    }

    const updateCategory = async (id, changes) => {
        if (changes.name && !serverCanCreateSlug(changes.name)) {
            return notify('ชื่อประเภทต้องมี A-Z/0-9 อย่างน้อย 1 ตัว เนื่องจาก Server สร้าง slug อัตโนมัติ')
        }
        try {
            await catalogApi.updateCategory(id, changes)
            setCategories(current => current.map(category => category.id === id ? { ...category, ...changes } : category))
            notify('อัปเดตสเตตัสแล้ว')
        } catch (error) {
            fail(error)
        }
    }

    const deleteCategory = async id => {
        if (products.some(product => product.categoryId === id)) {
            return notify('ลบไม่ได้ เนื่องจากยังมีสินค้าในประเภทนี้')
        }
        try {
            await catalogApi.deleteCategory(id)
            setCategories(current => current.filter(category => category.id !== id))
            notify('ลบประเภทสินค้าแล้ว')
        } catch (error) {
            fail(error)
        }
    }

    return (
        <>
            <PageHead eyebrow="CATALOG" title="จัดการประเภทสินค้า" description="จัดหมวดหมู่เพื่อให้ลูกค้าค้นหาเมนูได้ง่ายขึ้น" />
            <form className="admin-inline-form" onSubmit={addCategory}>
                <label>
                    ชื่อประเภทสินค้า
                    <input name="name" required placeholder="เช่น อาหารทานเล่น" />
                </label>
                <button className="admin-primary">+ เพิ่มประเภท</button>
            </form>
            <section className="admin-panel">
                <div className="admin-table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>ประเภท</th>
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
                                            className="admin-text-input"
                                            defaultValue={category.name}
                                            onBlur={event => event.target.value.trim() !== category.name && updateCategory(category.id, { name: event.target.value.trim() })}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            className="admin-number-input"
                                            type="number"
                                            min="0"
                                            defaultValue={category.sort_order}
                                            onBlur={event => Number(event.target.value) !== category.sort_order && updateCategory(category.id, { sortOrder: Number(event.target.value) })}
                                        />
                                    </td>
                                    <td>
                                        {products.filter(product => product.categoryId === category.id).length} รายการ
                                    </td>
                                    <td>
                                        <button className="admin-text-danger" onClick={() => deleteCategory(category.id)}>ลบ</button>
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
