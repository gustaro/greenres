export function KitchenProductsTab({ products }) {
    return (
        <section>
            <div className="staff-section-head">
                <div>
                    <h2>สถานะสินค้า</h2>
                    <p>ดูสถานะสินค้าและสต๊อกวัตถุดิบ</p>
                </div>
            </div>
            <div className="staff-table">
                <table>
                    <thead>
                        <tr>
                            <th>เมนู</th>
                            <th>คงเหลือ</th>
                            <th>สถานะ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => (
                            <tr key={product.id}>
                                <td>
                                    <div className="staff-product">
                                        <img src={product.img} alt="" />
                                        <b>{product.name}</b>
                                    </div>
                                </td>
                                <td>{product.stock} ชิ้น</td>
                                <td>
                                    <i className={`status ${product.status === 'หมด' ? 'pending' : product.status === 'วัตถุดิ้ ไม่เพียงพอ' ? 'cooking' : 'paid'}`}>
                                        {product.status}
                                    </i>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}
