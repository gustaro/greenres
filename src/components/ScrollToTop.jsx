import { useState, useEffect } from 'react'
import './ScrollToTop.css'

export function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.pageYOffset > 300) {
                setIsVisible(true)
            } else {
                setIsVisible(false)
            }
        }

        window.addEventListener('scroll', toggleVisibility, { passive: true })
        return () => window.removeEventListener('scroll', toggleVisibility)
    }, [])

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        })
    }

    if (!isVisible) return null

    return (
        <button
            type="button"
            className="scroll-to-top-btn"
            onClick={scrollToTop}
            aria-label="เลื่อนขึ้นบนสุด"
            title="เลื่อนขึ้นบนสุด"
        >
            <i className="bi bi-chevron-up"></i>
        </button>
    )
}
