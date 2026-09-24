/**
 * LimeLeaf Theme Palettes
 * 1. Classic Lime (เดิมปัจจุบัน)
 * 2. Sage Herb Garden (ตามรูปเมนูผัดผัก สดชื่น ออร์แกนิก)
 * 3. Matcha Latte (ชาเขียวญี่ปุ่น พรีเมียม ครีมมี่)
 * 4. Emerald Forest (เขียวมรกตอัญมณี หรูหราทันสมัย)
 * 5. Olive & Pistachio (เขียวมะกอก & พิสตาชิโอ อบอุ่น เป็นธรรมชาติ)
 * 6. Nordic Pine & Mint (เขียวไพน์นอร์ดิก & นีออนมิ้นต์ คูล มีพลัง)
 */

export const COLOR_THEMES = [
    {
        id: 'classic-lime',
        name: 'Lime Leaf Classic',
        nameTh: 'เขียวสดใสไลม์ลีฟ (ต้นตำรับ)',
        desc: 'โทนสีเขียวสดใสคู่สีเขียวมะนาว (Lime) สดชื่น โดดเด่น สไตล์โมเดิร์นคลาสสิกของร้าน',
        badge: 'ค่าเริ่มต้น',
        preview: {
            primary: '#12852f',
            accent: '#b8ff35',
            dark: '#075c1b',
            surface: '#f6faf2',
        },
        variables: {
            '--brand-primary': '#12852f',
            '--brand-primary-hover': '#0d7427',
            '--brand-primary-dark': '#075c1b',
            '--brand-accent': '#b8ff35',
            '--brand-accent-strong': '#9fe51f',
            '--brand-accent-soft': '#effbdc',
            '--brand-surface': '#f6faf2',
            '--brand-panel': '#ffffff',
            '--brand-text': '#17351f',
            '--brand-muted': '#6d7b6e',
            '--brand-border': '#72aa6e',
            '--brand-border-soft': '#d8e7d2',
            '--brand-highlight': '#edf38b',
            '--lime': '#b8ff35',
            '--chart': '#b8ff35',
            '--fern': '#16943a',
            '--juniper': '#2f6d36',
            '--pine': '#18a43d',
            '--deep': '#12852f',
            '--sage': '#e7f5dc',
            '--ink': '#17351f',
            '--cream': '#f6faf2',
        }
    },
    {
        id: 'sage-herb',
        name: 'Sage Herb Garden',
        nameTh: 'เขียวเสจสมุนไพรสดชื่น (ตามภาพเมนู)',
        desc: 'โทนสีเขียวเสจและสมุนไพรสดชื่น ถอดเฉดจากภาพเมนูผัดผักร้านอาหาร ดูสะอาดตา ออร์แกนิกและสดใส',
        badge: 'แนะนำจากภาพถ่าย',
        preview: {
            primary: '#2a7260',
            accent: '#76e2a2',
            dark: '#164e40',
            surface: '#f3f9f5',
        },
        variables: {
            '--brand-primary': '#2a7260',
            '--brand-primary-hover': '#215f50',
            '--brand-primary-dark': '#164e40',
            '--brand-accent': '#76e2a2',
            '--brand-accent-strong': '#54cf85',
            '--brand-accent-soft': '#e7f7ee',
            '--brand-surface': '#f3f9f5',
            '--brand-panel': '#ffffff',
            '--brand-text': '#14382e',
            '--brand-muted': '#638579',
            '--brand-border': '#69b59b',
            '--brand-border-soft': '#c3e7d9',
            '--brand-highlight': '#daf5c6',
            '--lime': '#76e2a2',
            '--chart': '#76e2a2',
            '--fern': '#2e8b6b',
            '--juniper': '#245a4a',
            '--pine': '#349977',
            '--deep': '#2a7260',
            '--sage': '#e7f7ee',
            '--ink': '#14382e',
            '--cream': '#f3f9f5',
        }
    },
    {
        id: 'matcha-latte',
        name: 'Matcha Latte',
        nameTh: 'เขียวมัทฉะพรีเมียม (ชาเขียวญี่ปุ่น)',
        desc: 'โทนสีเขียวใบชามัทฉะเข้มข้น ผสานสีชาเขียวครีมมี่ สบายตา อบอุ่น สไตล์คาเฟ่ญี่ปุ่นร่วมสมัย',
        badge: 'สไตล์คาเฟ่',
        preview: {
            primary: '#3d7332',
            accent: '#d2f041',
            dark: '#25471d',
            surface: '#f7faf3',
        },
        variables: {
            '--brand-primary': '#3d7332',
            '--brand-primary-hover': '#325f29',
            '--brand-primary-dark': '#25471d',
            '--brand-accent': '#d2f041',
            '--brand-accent-strong': '#bfe028',
            '--brand-accent-soft': '#f0f8dc',
            '--brand-surface': '#f7faf3',
            '--brand-panel': '#ffffff',
            '--brand-text': '#1d3318',
            '--brand-muted': '#6d8067',
            '--brand-border': '#7ea872',
            '--brand-border-soft': '#d7e6d0',
            '--brand-highlight': '#f9fcb1',
            '--lime': '#d2f041',
            '--chart': '#d2f041',
            '--fern': '#448437',
            '--juniper': '#2f5b26',
            '--pine': '#4a923d',
            '--deep': '#3d7332',
            '--sage': '#e8f4de',
            '--ink': '#1d3318',
            '--cream': '#f7faf3',
        }
    },
    {
        id: 'emerald-forest',
        name: 'Emerald Forest',
        nameTh: 'เขียวมรกตอัญมณี (หรูหราทันสมัย)',
        desc: 'โทนสีเขียวมรกตสดประกายอัญมณี สวยพรีเมียม โมเดิร์น สะอาดตา และดูมีระดับ',
        badge: 'พรีเมียม',
        preview: {
            primary: '#059669',
            accent: '#34d399',
            dark: '#064e3b',
            surface: '#f0fdf4',
        },
        variables: {
            '--brand-primary': '#059669',
            '--brand-primary-hover': '#047857',
            '--brand-primary-dark': '#064e3b',
            '--brand-accent': '#34d399',
            '--brand-accent-strong': '#10b981',
            '--brand-accent-soft': '#ecfdf5',
            '--brand-surface': '#f0fdf4',
            '--brand-panel': '#ffffff',
            '--brand-text': '#062e24',
            '--brand-muted': '#527d70',
            '--brand-border': '#34d399',
            '--brand-border-soft': '#a7f3d0',
            '--brand-highlight': '#a7f3d0',
            '--lime': '#34d399',
            '--chart': '#34d399',
            '--fern': '#10b981',
            '--juniper': '#047857',
            '--pine': '#059669',
            '--deep': '#047857',
            '--sage': '#d1fae5',
            '--ink': '#062e24',
            '--cream': '#f0fdf4',
        }
    },
    {
        id: 'olive-pistachio',
        name: 'Olive & Pistachio',
        nameTh: 'เขียวมะกอก & พิสตาชิโอ (อบอุ่นเป็นธรรมชาติ)',
        desc: 'โทนสีเขียวมะกอกและถั่วพิสตาชิโอ อบอุ่น น่าทาน เป็นธรรมชาติแบบเมดิเตอร์เรเนียน',
        badge: 'ธรรมชาติ',
        preview: {
            primary: '#5c7c24',
            accent: '#c6f135',
            dark: '#374d11',
            surface: '#fafcf5',
        },
        variables: {
            '--brand-primary': '#5c7c24',
            '--brand-primary-hover': '#4c671c',
            '--brand-primary-dark': '#374d11',
            '--brand-accent': '#c6f135',
            '--brand-accent-strong': '#b0dc24',
            '--brand-accent-soft': '#f5fbde',
            '--brand-surface': '#fafcf5',
            '--brand-panel': '#ffffff',
            '--brand-text': '#24330b',
            '--brand-muted': '#77855d',
            '--brand-border': '#90ab51',
            '--brand-border-soft': '#e0edd0',
            '--brand-highlight': '#f5fbc7',
            '--lime': '#c6f135',
            '--chart': '#c6f135',
            '--fern': '#6c9429',
            '--juniper': '#456018',
            '--pine': '#78a22e',
            '--deep': '#5c7c24',
            '--sage': '#ecf5db',
            '--ink': '#24330b',
            '--cream': '#fafcf5',
        }
    },
    {
        id: 'nordic-pine',
        name: 'Nordic Pine & Mint',
        nameTh: 'เขียวไพน์นอร์ดิก & มิ้นต์ (สดชื่นกระปรี้กระเปร่า)',
        desc: 'โทนสีเขียวสนไพน์ผสมนีออนมิ้นต์สดชื่นสไตล์สแกนดิเนเวีย ทันสมัย คูล และมีชีวิตชีวา',
        badge: 'โมเดิร์นคูล',
        preview: {
            primary: '#1b6b5c',
            accent: '#2ee8b6',
            dark: '#0d3d34',
            surface: '#f2faf7',
        },
        variables: {
            '--brand-primary': '#1b6b5c',
            '--brand-primary-hover': '#155549',
            '--brand-primary-dark': '#0d3d34',
            '--brand-accent': '#2ee8b6',
            '--brand-accent-strong': '#12d29e',
            '--brand-accent-soft': '#e5faf4',
            '--brand-surface': '#f2faf7',
            '--brand-panel': '#ffffff',
            '--brand-text': '#0b2923',
            '--brand-muted': '#597a73',
            '--brand-border': '#42a893',
            '--brand-border-soft': '#bceddf',
            '--brand-highlight': '#aff5dc',
            '--lime': '#2ee8b6',
            '--chart': '#2ee8b6',
            '--fern': '#238976',
            '--juniper': '#16574a',
            '--pine': '#289d87',
            '--deep': '#1b6b5c',
            '--sage': '#d8f5ec',
            '--ink': '#0b2923',
            '--cream': '#f2faf7',
        }
    }
]

export const DEFAULT_THEME_ID = 'classic-lime'

/**
 * Applies the specified theme ID to document root
 */
export function applyTheme(themeId) {
    if (typeof document === 'undefined') return
    const theme = COLOR_THEMES.find(t => t.id === themeId) || COLOR_THEMES[0]

    document.documentElement.setAttribute('data-theme', theme.id)
    try {
        localStorage.setItem('limeleaf-color-theme', theme.id)
    } catch {}

    // Set inline CSS variables on document.documentElement for instant propagation
    const rootStyle = document.documentElement.style
    Object.entries(theme.variables).forEach(([key, val]) => {
        rootStyle.setProperty(key, val)
    })

    // Dispatch event in case components want to re-render or animate
    window.dispatchEvent(new CustomEvent('limeleaf-theme-change', { detail: { themeId: theme.id, theme } }))
}

/**
 * Initializes theme on initial load from localStorage
 */
export function initTheme() {
    if (typeof window === 'undefined') return DEFAULT_THEME_ID
    try {
        const saved = localStorage.getItem('limeleaf-color-theme') || DEFAULT_THEME_ID
        applyTheme(saved)
        return saved
    } catch {
        applyTheme(DEFAULT_THEME_ID)
        return DEFAULT_THEME_ID
    }
}
