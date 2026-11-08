import styles from './adminPage.module.css'
import { useEffect, useState } from 'react'
import { Save, RefreshCw, Settings as SettingsIcon } from 'lucide-react'
import { adminApi } from '../../services/api'
import './AdminSettings.css'

const blank = { minRequiredVEs: '', maxRequiredVEs: '', maxRequestsPerDay: '', processingInstructions: '', userFacingMessage: '' }

export default function AdminSettings() {
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const load = async () => {
    try {
      setLoading(true); setError('')
      const { data } = await adminApi.get('/admin/settings')
      const value = data.settings || {}
      setForm({
        minRequiredVEs: value.minRequiredVEs ?? '', maxRequiredVEs: value.maxRequiredVEs ?? '',
        maxRequestsPerDay: value.maxRequestsPerDay ?? '', processingInstructions: value.processingInstructions || '',
        userFacingMessage: value.userFacingMessage || ''
      })
    } catch (e) { setError(e.response?.data?.message || 'Unable to load settings.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const submit = async (event) => {
    event.preventDefault()
    const changeReason = window.prompt('Why are you changing these system settings? (5–250 characters)')
    if (!changeReason || changeReason.trim().length < 5 || changeReason.trim().length > 250) {
      setError('A valid change reason is required.'); return
    }
    try {
      setSaving(true); setError(''); setSuccess('')
      const payload = {
        minRequiredVEs: form.minRequiredVEs === '' ? null : Number(form.minRequiredVEs),
        maxRequiredVEs: form.maxRequiredVEs === '' ? null : Number(form.maxRequiredVEs),
        maxRequestsPerDay: form.maxRequestsPerDay === '' ? null : Number(form.maxRequestsPerDay),
        processingInstructions: form.processingInstructions,
        userFacingMessage: form.userFacingMessage,
        changeReason: changeReason.trim()
      }
      const { data } = await adminApi.patch('/admin/settings', payload)
      const value = data.settings
      setForm({ minRequiredVEs: value.minRequiredVEs ?? '', maxRequiredVEs: value.maxRequiredVEs ?? '', maxRequestsPerDay: value.maxRequestsPerDay ?? '', processingInstructions: value.processingInstructions || '', userFacingMessage: value.userFacingMessage || '' })
      setSuccess(data.message || 'Settings saved.')
    } catch (e) { setError(e.response?.data?.message || 'Unable to save settings.') }
    finally { setSaving(false) }
  }
  if (loading) return <main className={`${styles.page} admin-settings-page`}><p>Loading settings…</p></main>
  return <main className={`${styles.page} admin-settings-page`}>
    <header><span><SettingsIcon size={18}/> SYSTEM CONFIGURATION</span><h1>Redemption Settings</h1><p>Configure global limits and user-facing payout guidance. Leave a limit empty to disable that rule.</p></header>
    {error && <div className="settings-alert error" role="alert">{error}</div>}
    {success && <div className="settings-alert success" role="status">{success}</div>}
    <form onSubmit={submit} className="settings-form">
      <section><h2>Redemption limits</h2><div className="settings-grid">
        <label>Minimum required VEs<input type="number" min="1" step="1" value={form.minRequiredVEs} onChange={e => update('minRequiredVEs', e.target.value)} placeholder="No minimum" /></label>
        <label>Maximum required VEs<input type="number" min="1" step="1" value={form.maxRequiredVEs} onChange={e => update('maxRequiredVEs', e.target.value)} placeholder="No maximum" /></label>
        <label>Maximum requests per user per UTC day<input type="number" min="1" step="1" value={form.maxRequestsPerDay} onChange={e => update('maxRequestsPerDay', e.target.value)} placeholder="No daily limit" /></label>
      </div><small>These rules are enforced by the backend when generating quotes and creating redemptions. Existing reward values are not changed.</small></section>
      <section><h2>User-facing information</h2>
        <label>Notice message<textarea maxLength="300" rows="2" value={form.userFacingMessage} onChange={e => update('userFacingMessage', e.target.value)} placeholder="Optional payout notice shown to users" /></label>
        <label>Processing instructions<textarea maxLength="1000" rows="4" value={form.processingInstructions} onChange={e => update('processingInstructions', e.target.value)} placeholder="Explain what happens after a redemption is submitted" /></label>
      </section>
      <button type="submit" disabled={saving}><Save size={17}/>{saving ? 'Saving…' : 'Save settings'}</button>
      <button type="button" className="secondary" onClick={load} disabled={saving}><RefreshCw size={16}/> Refresh</button>
    </form>
  </main>
}
