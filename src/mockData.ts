// mockData.ts
// This file serves as a simulated database corresponding to the schema requirements (PRD).

export const mockUsers = [
    { id: 'u1', name: 'Tony (Customer)', role: 'customer', status: 'active', points: 120 },
    { id: 'u2', name: 'Chef Gordon', role: 'kitchen', status: 'active', points: 0 },
    { id: 'u3', name: 'Admin Jane', role: 'admin', status: 'active', points: 0 },
    { id: 'u4', name: 'Delivery Dan', role: 'delivery', status: 'active', points: 0 },
    { id: 'u5', name: 'Cashier Pam', role: 'cashier', status: 'active', points: 0 }
];

export const mockCategories = [
    { id: 'c1', name: 'ข้าว' },
    { id: 'c2', name: 'เส้น' },
    { id: 'c3', name: 'ของหวาน' },
    { id: 'c4', name: 'เครื่องดื่ม' }
];

export const mockProducts = [
    { id: '1', categoryId: 'c1', name: 'ข้าวกะเพราไก่กรอบ', en: 'Crispy Basil Chicken Rice', price: 119, img: '/assets/basil-rice.png', status: 'มี' },
    { id: '2', categoryId: 'c2', name: 'สปาเกตตีต้มยำกุ้ง', en: 'Tom Yum Prawn Spaghetti', price: 159, img: '/assets/pad-thai.png', status: 'มี' },
    { id: '3', categoryId: 'c1', name: 'ข้าวแกงเขียวหวานไก่ย่าง', en: 'Green Curry Grilled Chicken', price: 145, img: '/assets/green-curry.png', status: 'เหลือน้อย' },
    { id: '4', categoryId: 'c1', name: 'ลาบไก่ควินัวโบวล์', en: 'Larb Quinoa Bowl', price: 169, img: '/assets/larb.png', status: 'มี' },
    { id: '5', categoryId: 'c3', name: 'ชีสเค้กข้าวเหนียวมะม่วง', en: 'Mango Sticky Rice Cheesecake', price: 109, img: '/assets/mango-sticky-rice.png', status: 'มี' },
    { id: '6', categoryId: 'c4', name: 'ชาไทยมะนาวโซดา', en: 'Thai Tea Lemon Soda', price: 79, img: '/assets/lemon-tea.png', status: 'หมด' }
];

export const mockInventory = [
    { id: 'inv1', ingredientName: 'เนื้อไก่', quantity: 50, unit: 'kg', status: 'ยังคงเหลือ', lastUpdatedBy: 'u3' },
    { id: 'inv2', ingredientName: 'กุ้งสด', quantity: 10, unit: 'kg', status: 'เหลือน้อย', lastUpdatedBy: 'u2' },
    { id: 'inv3', ingredientName: 'ใบกะเพรา', quantity: 5, unit: 'kg', status: 'ยังคงเหลือ', lastUpdatedBy: 'u2' }
];

export const mockPromotions = [
    { id: 'p1', code: 'LIME20', description: 'ลด 20%', discountType: 'percent', discountValue: 20, isActive: true }
];

export const initialMockOrders = [
    {
        id: 'ORD-001',
        customerId: 'u1',
        items: [
            { id: 'i1', productId: '1', quantity: 2, priceAtTime: 119, note: 'ไม่เผ็ด' },
            { id: 'i2', productId: '6', quantity: 2, priceAtTime: 79 }
        ],
        subtotal: 396,
        discountAmount: 0,
        deliveryFee: 39,
        totalAmount: 435,
        paymentMethod: 'เงินสด',
        isPaid: false,
        deliveryType: 'ให้จัดส่ง',
        deliveryAddress: '123 ถ.สุขุมวิท กรุงเทพ',
        foodStatus: 'รอยืนยัน',
        createdAt: new Date().toISOString()
    },
    {
        id: 'ORD-002',
        customerId: 'u1',
        items: [
            { id: 'i3', productId: '2', quantity: 1, priceAtTime: 159 }
        ],
        subtotal: 159,
        discountAmount: 0,
        deliveryFee: 0,
        totalAmount: 159,
        paymentMethod: 'โอนเงิน',
        isPaid: true,
        deliveryType: 'รับเองที่ร้าน',
        foodStatus: 'ทำเสร็จแล้ว',
        createdAt: new Date(Date.now() - 3600000).toISOString()
    }
];
