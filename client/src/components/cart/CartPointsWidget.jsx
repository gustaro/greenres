import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { useLanguage } from '../../lib/LanguageContext'

export function CartPointsWidget({
    subtotal = 0,
    pointsToUse = 0,
    setPointsToUse,
    onAuth = null,
    compact = false,
}) {
    const { session, profile, settings } = useAuth()
    const { isEn, t } = useLanguage()

    const pointsEnabled = settings?.pointsEnabled !== false
    const redeemRate = Number(settings?.pointsRedeemRate || 10)
    const minRedeem = Number(settings?.pointsMinRedeem || 10)
    const maxDiscountPercent = Number(settings?.pointsMaxDiscountPercent ?? 100)

    const userPoints = Number(profile?.points || 0)

    // Calculate maximum points that can be redeemed on this order
    const maxDiscountAllowed = Math.floor((subtotal * maxDiscountPercent) / 100)
    const maxPointsNeeded = maxDiscountAllowed * redeemRate
    const maxUsablePoints = Math.max(0, Math.min(userPoints, maxPointsNeeded))

    const [inputValue, setInputValue] = useState(pointsToUse > 0 ? String(pointsToUse) : '')
    const [errorMsg, setErrorMsg] = useState('')

    // Keep input synchronized if pointsToUse is changed externally (e.g. cleared)
    useEffect(() => {
        if (pointsToUse === 0 && inputValue !== '') {
            setInputValue('')
            setErrorMsg('')
        } else if (pointsToUse > 0 && String(pointsToUse) !== inputValue) {
            setInputValue(String(pointsToUse))
        }
    }, [pointsToUse])

    // If subtotal drops and current points exceed new maximum, clamp it
    useEffect(() => {
        if (pointsToUse > maxUsablePoints && maxUsablePoints > 0) {
            setPointsToUse?.(maxUsablePoints)
            setInputValue(String(maxUsablePoints))
        } else if (subtotal === 0 && pointsToUse > 0) {
            setPointsToUse?.(0)
            setInputValue('')
        }
    }, [subtotal, maxUsablePoints, pointsToUse, setPointsToUse])

    if (!pointsEnabled) {
        return null
    }

    if (!session) {
        return (
            <div className="cart-points-widget cart-points-widget--guest">
                <div className="cart-points-guest-info">
                    <i className="bi bi-stars cart-points-icon text-warning" />
                    <span>{t('cartPointsLoginPrompt')}</span>
                </div>
                {onAuth && (
                    <button type="button" className="cart-points-auth-btn" onClick={onAuth}>
                        {t('authSignIn')}
                    </button>
                )}
            </div>
        )
    }

    const currentEntered = parseInt(inputValue || '0', 10)
    const currentDiscount = currentEntered > 0 ? Math.floor(currentEntered / redeemRate) : 0
    const maxPotentialDiscount = Math.floor(userPoints / redeemRate)

    const handleInputChange = e => {
        const val = e.target.value.replace(/[^0-9]/g, '')
        setInputValue(val)

        if (!val || val === '0') {
            setPointsToUse?.(0)
            setErrorMsg('')
            return
        }

        const num = parseInt(val, 10)
        if (num > userPoints) {
            setErrorMsg(isEn ? `You have ${userPoints} points` : `คุณมีแต้มสะสม ${userPoints} แต้ม`)
            setPointsToUse?.(0)
            return
        }

        if (num > maxUsablePoints) {
            setErrorMsg(isEn ? `Maximum usable for this order is ${maxUsablePoints} pts` : `ใช้ได้สูงสุด ${maxUsablePoints} แต้มสำหรับออเดอร์นี้`)
            setPointsToUse?.(0)
            return
        }

        if (minRedeem > 0 && num < minRedeem) {
            setErrorMsg(isEn ? `Minimum ${minRedeem} points required` : `แลกขั้นต่ำ ${minRedeem} แต้ม`)
            setPointsToUse?.(0)
            return
        }

        setErrorMsg('')
        setPointsToUse?.(num)
    }

    const handleUseMax = () => {
        if (maxUsablePoints <= 0) return
        setInputValue(String(maxUsablePoints))
        if (minRedeem > 0 && maxUsablePoints < minRedeem) {
            setErrorMsg(isEn ? `Minimum ${minRedeem} points required` : `แลกขั้นต่ำ ${minRedeem} แต้ม`)
            setPointsToUse?.(0)
            return
        }
        setErrorMsg('')
        setPointsToUse?.(maxUsablePoints)
    }

    const handleClear = () => {
        setInputValue('')
        setErrorMsg('')
        setPointsToUse?.(0)
    }

    return (
        <div className={`cart-points-widget ${compact ? 'cart-points-widget--compact' : ''}`}>
            <div className="cart-points-header">
                <div className="cart-points-title">
                    <span className="cart-points-badge-icon">
                        <i className="bi bi-coin" />
                    </span>
                    <div>
                        <b>{t('cartPointsTitle')}</b>
                        <small className="cart-points-rate">
                            {t('cartPointsDiscountRateDesc').replace('{rate}', redeemRate)}
                        </small>
                    </div>
                </div>
                <div className="cart-points-balance">
                    <small>{t('cartPointsBalance')}</small>
                    <strong>{userPoints.toLocaleString()} <span className="cart-points-unit">{t('profilePointsUnit')}</span></strong>
                    {userPoints > 0 && maxPotentialDiscount > 0 && (
                        <span className="cart-points-worth">
                            ({isEn ? 'Worth' : 'ลดได้'} ฿{maxPotentialDiscount})
                        </span>
                    )}
                </div>
            </div>

            {userPoints === 0 ? (
                <div className="cart-points-empty">
                    <small>{isEn ? 'Earn points automatically on delivered orders!' : 'สั่งซื้ออาหารเพื่อเริ่มสะสมแต้มส่วนลดในทุกออเดอร์'}</small>
                </div>
            ) : subtotal <= 0 ? (
                <div className="cart-points-empty">
                    <small>{isEn ? 'Add items to cart to redeem points' : 'เลือกอาหารใส่ตะกร้าเพื่อใช้แต้มแลกส่วนลด'}</small>
                </div>
            ) : (
                <div className="cart-points-body">
                    <div className="cart-points-input-group">
                        <div className="cart-points-input-wrap">
                            <input
                                type="number"
                                min="0"
                                max={maxUsablePoints}
                                step="1"
                                inputMode="numeric"
                                value={inputValue}
                                onChange={handleInputChange}
                                placeholder={t('cartPointsPlaceholder')}
                                className={`cart-points-input ${errorMsg ? 'has-error' : ''}`}
                            />
                            <span className="cart-points-input-affix">{t('profilePointsUnit')}</span>
                        </div>
                        <button
                            type="button"
                            className="cart-points-max-btn"
                            onClick={handleUseMax}
                            disabled={maxUsablePoints <= 0 || (minRedeem > 0 && maxUsablePoints < minRedeem)}
                            title={isEn ? `Use max ${maxUsablePoints} points` : `ใช้แต้มสูงสุด ${maxUsablePoints} แต้ม`}
                        >
                            {t('cartPointsUseMax')}
                        </button>
                        {pointsToUse > 0 && (
                            <button
                                type="button"
                                className="cart-points-clear-btn"
                                onClick={handleClear}
                                title={t('cartPointsClear')}
                            >
                                <i className="bi bi-x-lg" />
                            </button>
                        )}
                    </div>

                    {errorMsg && (
                        <div className="cart-points-feedback cart-points-feedback--error">
                            <i className="bi bi-exclamation-circle-fill me-1" />
                            {errorMsg}
                        </div>
                    )}

                    {pointsToUse > 0 && !errorMsg && currentDiscount > 0 && (
                        <div className="cart-points-feedback cart-points-feedback--success">
                            <i className="bi bi-check-circle-fill me-1" />
                            <span>
                                {isEn
                                    ? `Redeemed ${pointsToUse} pts: -฿${currentDiscount} discount applied!`
                                    : `ใช้ ${pointsToUse} แต้ม: ได้รับส่วนลด -฿${currentDiscount}!`}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
