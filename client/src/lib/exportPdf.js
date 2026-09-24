/**
 * exportPdf — Print-to-PDF utility (no external library needed)
 *
 * Creates a hidden iframe with self-contained HTML, triggers the browser
 * print dialog (which can save as PDF), then cleans up.
 *
 * @param {string} html  Full HTML document string (including <html>, <head>, <body>)
 */
export function exportPdf(html) {
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow.document
    doc.open()
    doc.write(html)
    doc.close()

    // Give images / fonts a moment to load, then print
    iframe.onload = () => {
        setTimeout(() => {
            iframe.contentWindow.focus()
            iframe.contentWindow.print()
            // Remove iframe after print dialog closes
            setTimeout(() => document.body.removeChild(iframe), 1000)
        }, 300)
    }
}

/** Shared print-page CSS generator that dynamically inherits the active theme colors */
function generatePdfBaseCss() {
    let primary = '#12852f'
    let primaryDark = '#075c1b'
    let accent = '#b8ff35'
    let accentSoft = '#effbdc'
    let surface = '#f6faf2'
    let border = '#d8e7d2'

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const rootStyle = getComputedStyle(document.documentElement)
        primary = rootStyle.getPropertyValue('--brand-primary').trim() || primary
        primaryDark = rootStyle.getPropertyValue('--brand-primary-dark').trim() || primaryDark
        accent = rootStyle.getPropertyValue('--brand-accent').trim() || accent
        accentSoft = rootStyle.getPropertyValue('--brand-accent-soft').trim() || accentSoft
        surface = rootStyle.getPropertyValue('--brand-surface').trim() || surface
        border = rootStyle.getPropertyValue('--brand-border').trim() || border
    }

    return `
    :root {
        --brand-primary: ${primary};
        --brand-primary-dark: ${primaryDark};
        --brand-accent: ${accent};
        --brand-accent-soft: ${accentSoft};
        --brand-surface: ${surface};
        --brand-border: ${border};
    }
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Noto Sans Thai', 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }
    h1 { font-size: 18px; color: var(--brand-primary, ${primary}); margin-bottom: 2px; }
    h2 { font-size: 13px; color: var(--brand-primary, ${primary}); margin: 18px 0 8px; border-bottom: 1.5px solid var(--brand-accent, ${accent}); padding-bottom: 4px; }
    h3 { font-size: 11px; margin: 12px 0 6px; color: #333; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 2px solid var(--brand-primary, ${primary}); margin-bottom: 16px; }
    .header-brand { display: flex; align-items: center; gap: 10px; }
    .brand-dot { width: 28px; height: 28px; background: var(--brand-accent, ${accent}); border-radius: 50%; display: inline-block; }
    .brand-name { font-size: 16px; font-weight: 900; color: var(--brand-primary, ${primary}); }
    .brand-sub { font-size: 9px; color: #6d7b6e; letter-spacing: 1.5px; display: block; }
    .header-meta { text-align: right; font-size: 10px; color: #555; line-height: 1.7; }
    .stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
    .stat-box { border: 1px solid var(--brand-border, ${border}); border-radius: 6px; padding: 10px 14px; }
    .stat-box small { font-size: 9px; color: #6d7b6e; letter-spacing: 1px; text-transform: uppercase; display: block; margin-bottom: 3px; }
    .stat-box strong { font-size: 16px; font-weight: 900; color: var(--brand-primary, ${primary}); }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px; }
    thead tr { background: var(--brand-primary, ${primary}); color: #fff; }
    thead th { padding: 6px 8px; text-align: left; font-weight: 700; font-size: 9px; letter-spacing: 0.5px; }
    tbody tr:nth-child(even) { background: var(--brand-surface, ${surface}); }
    tbody td { padding: 5px 8px; border-bottom: 1px solid #eef3ec; vertical-align: top; }
    tbody tr.continuation td { border-bottom: 1px dashed #e5ede2; }
    tbody tr.continuation td:first-child { color: #aaa; }
    .summary-table { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
    .summary-table table { margin-top: 0; }
    .section-title { font-size: 10px; font-weight: 900; letter-spacing: 1.5px; color: #6d7b6e; text-transform: uppercase; margin-bottom: 6px; }
    .amount { text-align: right; font-weight: 700; color: var(--brand-primary, ${primary}); }
    .footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e0e8dc; font-size: 9px; color: #999; text-align: center; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `
}

/** Shared print-page CSS object that dynamically resolves when coerced to string */
export const PDF_BASE_CSS = {
    toString() {
        return generatePdfBaseCss()
    },
    valueOf() {
        return generatePdfBaseCss()
    }
}

