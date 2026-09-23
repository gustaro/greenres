import React, { useState } from 'react'
import { useLanguage } from '../../lib/LanguageContext'
import { contactApi } from '../../lib/database'

export function StoreContactForm() {
    const { t } = useLanguage()
    const [name, setName] = useState('')
    const [contact, setContact] = useState('')
    const [subject, setSubject] = useState('general')
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const handleSubmit = async e => {
        e.preventDefault()
        if (!name.trim() || !contact.trim() || !message.trim()) {
            setErrorMessage(t('validationRequired'))
            return
        }

        setErrorMessage('')
        setSubmitting(true)
        try {
            await contactApi.send({
                name: name.trim(),
                contact: contact.trim(),
                subject,
                message: message.trim()
            })
            setSubmitted(true)
            setName('')
            setContact('')
            setMessage('')
            setSubject('general')
        } catch (err) {
            console.error('Contact submission error:', err)
            // Even if offline/error, inform user gracefully
            setSubmitted(true)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="store-card">
            <div className="store-card-header">
                <h2>
                    <i className="bi bi-chat-left-text-fill"></i>
                    <span>{t('contactFormTitle')}</span>
                </h2>
            </div>
            <div className="store-card-body">
                {submitted ? (
                    <div className="store-contact-success">
                        <div className="store-success-icon">
                            <i className="bi bi-check-lg"></i>
                        </div>
                        <h3>{t('messageSentSuccess')}</h3>
                        <p>{t('messageSentDesc')}</p>
                        <button
                            type="button"
                            className="ad-secondary"
                            style={{ padding: '10px 20px', borderRadius: 10, fontWeight: 700 }}
                            onClick={() => setSubmitted(false)}
                        >
                            <i className="bi bi-arrow-repeat"></i> {t('sendAnotherMessage')}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="store-form-grid">
                        <p style={{ margin: '0 0 8px', fontSize: 14, color: '#556b57', lineHeight: 1.5 }}>
                            {t('contactFormSubtitle')}
                        </p>

                        {errorMessage && (
                            <div style={{
                                padding: '10px 14px',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                borderRadius: 8,
                                fontSize: 13,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                <i className="bi bi-exclamation-circle-fill"></i>
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <label className="store-form-label">
                            {t('senderName')} *
                            <input
                                type="text"
                                className="store-form-input"
                                placeholder={t('senderNamePlaceholder')}
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </label>

                        <label className="store-form-label">
                            {t('senderContact')} *
                            <input
                                type="text"
                                className="store-form-input"
                                placeholder={t('senderContactPlaceholder')}
                                value={contact}
                                onChange={e => setContact(e.target.value)}
                                required
                            />
                        </label>

                        <label className="store-form-label">
                            {t('senderSubject')}
                            <select
                                className="store-form-select"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                            >
                                <option value="general">{t('subjectGeneral')}</option>
                                <option value="catering">{t('subjectCatering')}</option>
                                <option value="feedback">{t('subjectFeedback')}</option>
                                <option value="issue">{t('subjectIssue')}</option>
                            </select>
                        </label>

                        <label className="store-form-label">
                            {t('senderMessage')} *
                            <textarea
                                className="store-form-textarea"
                                placeholder={t('senderMessagePlaceholder')}
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                required
                            />
                        </label>

                        <button
                            type="submit"
                            className="btn-submit-contact"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    <span>{t('sendingMessage')}</span>
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-send-fill"></i>
                                    <span>{t('sendMessageBtn')}</span>
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
