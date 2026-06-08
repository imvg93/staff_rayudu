import { useState, useRef } from 'react';
import api from '../api.js';
import { useApi, Modal, Field, EmployeeSelect, Spinner, EmployeeCell, Badge } from '../components/ui.jsx';
import { fmtDate } from '../api.js';
import { Camera, FileImage, X, ZoomIn } from 'lucide-react';

const DOC_TYPES = [
  { value: 'aadhaar',             label: 'Aadhaar Card' },
  { value: 'pan',                 label: 'PAN Card' },
  { value: 'bank',                label: 'Bank Passbook / Cheque' },
  { value: 'photo',               label: 'Passport Photo' },
  { value: 'police_verification', label: 'Police Verification' },
  { value: 'certificate',         label: 'Certificate / Degree' },
  { value: 'other',               label: 'Other' },
];

export default function Documents() {
  const { data, loading, error, reload } = useApi('/documents');
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formErr, setFormErr]   = useState(null);
  const [viewUrl, setViewUrl]   = useState(null);
  const fileRef = useRef();

  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const openNew  = () => { setForm({ verified: 0 }); setEditing({}); setFormErr(null); };
  const openEdit = (row) => { setForm({ ...row }); setEditing(row); setFormErr(null); };

  // ── File / camera upload ─────────────────────────────────
  const triggerPick = (useCamera) => {
    const inp = fileRef.current;
    if (useCamera) inp.setAttribute('capture', 'environment');
    else           inp.removeAttribute('capture');
    inp.value = '';
    inp.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setFormErr(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/employees/upload', fd);
      set({ file_url: res.data.url });
    } catch (err) {
      setFormErr('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally { setUploading(false); }
  };

  // ── Save ─────────────────────────────────────────────────
  const save = async () => {
    if (!form.employee_id) { setFormErr('Please select an employee'); return; }
    if (!form.doc_type)    { setFormErr('Please select a document type'); return; }
    setSaving(true); setFormErr(null);
    try {
      const payload = {
        employee_id: form.employee_id,
        doc_type:    form.doc_type,
        number:      form.number   || null,
        file_url:    form.file_url || null,
        verified:    form.verified ? 1 : 0,
      };
      if (editing.id) await api.put(`/documents/${editing.id}`, payload);
      else            await api.post('/documents', payload);
      setEditing(null); reload();
    } catch (e) {
      setFormErr(e.response?.data?.error || e.message);
    } finally { setSaving(false); }
  };

  const remove = async (row) => {
    if (!confirm('Delete this document record?')) return;
    await api.delete(`/documents/${row.id}`); reload();
  };

  const rows = data || [];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Staff Document Management</h1>
          <p>Aadhaar, PAN, bank & verification records — capture photos directly from camera</p>
        </div>
        <button className="btn" onClick={openNew}>+ Add Document</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="panel">
        {loading ? <Spinner /> : rows.length === 0 ? (
          <div className="empty">No documents yet. Click "Add Document" to upload one.</div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Document Type</th>
                  <th>Number / Reference</th>
                  <th>Photo</th>
                  <th>Verified</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td><EmployeeCell row={row} /></td>
                    <td>
                      <Badge
                        value={row.doc_type}
                        label={DOC_TYPES.find(d => d.value === row.doc_type)?.label || row.doc_type?.toUpperCase()}
                      />
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{row.number || '—'}</td>
                    <td>
                      {row.file_url ? (
                        <div
                          onClick={() => setViewUrl(row.file_url)}
                          style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
                          title="Click to view full size"
                        >
                          <img
                            src={row.file_url}
                            alt="doc"
                            style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--line)', display: 'block' }}
                          />
                          <div style={{
                            position: 'absolute', inset: 0, borderRadius: 5,
                            background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background .15s',
                          }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.35)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
                          >
                            <ZoomIn size={14} color="#fff" />
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>No image</span>
                      )}
                    </td>
                    <td>
                      {row.verified
                        ? <Badge value="approved" label="✓ Verified" />
                        : <Badge value="pending"  label="Pending" />}
                    </td>
                    <td>
                      <div className="btn-row">
                        <button className="btn sm gray"   onClick={() => openEdit(row)}>Edit</button>
                        <button className="btn sm danger" onClick={() => remove(row)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ───────────────────────────────── */}
      {editing && (
        <Modal
          title={editing.id ? 'Edit Document' : 'Add Document'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn gray" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn" onClick={save} disabled={saving || uploading}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          }
        >
          {formErr && <div className="error-msg">{formErr}</div>}

          <div className="form-grid">
            {/* Employee */}
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Employee">
                <EmployeeSelect value={form.employee_id} onChange={v => set({ employee_id: v })} />
              </Field>
            </div>

            {/* Doc type */}
            <Field label="Document Type">
              <select value={form.doc_type ?? ''} onChange={e => set({ doc_type: e.target.value })}>
                <option value="">— Select type —</option>
                {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>

            {/* Number */}
            <Field label="Number / Reference">
              <input
                type="text"
                value={form.number ?? ''}
                onChange={e => set({ number: e.target.value })}
                placeholder="e.g. 1234 5678 9012"
              />
            </Field>

            {/* Verified */}
            <Field label="Verification Status">
              <select value={form.verified ? '1' : '0'} onChange={e => set({ verified: e.target.value === '1' })}>
                <option value="0">Pending</option>
                <option value="1">Verified</option>
              </select>
            </Field>

            {/* ── Document photo capture ─────────────────── */}
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Document Photo">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {/* Preview */}
                  {form.file_url && (
                    <div style={{ position: 'relative', display: 'inline-block', alignSelf: 'flex-start' }}>
                      <img
                        src={form.file_url}
                        alt="preview"
                        style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, objectFit: 'contain', border: '1px solid var(--line)' }}
                      />
                      <button
                        type="button"
                        onClick={() => set({ file_url: null })}
                        style={{
                          position: 'absolute', top: 6, right: 6,
                          background: '#dc2626', border: 'none', borderRadius: '50%',
                          width: 24, height: 24, color: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                        }}
                        title="Remove photo"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  {/* Hidden file input */}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFile}
                  />

                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn sm gray"
                      onClick={() => triggerPick(false)}
                      disabled={uploading}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <FileImage size={14} />
                      {uploading ? 'Uploading…' : 'Upload from Gallery'}
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => triggerPick(true)}
                      disabled={uploading}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1B4332' }}
                    >
                      <Camera size={14} />
                      Take Photo
                    </button>
                  </div>

                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    "Take Photo" opens the camera directly on mobile · Max 3 MB · JPG / PNG / WEBP
                  </span>
                </div>
              </Field>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Full-size document viewer ──────────────────────── */}
      {viewUrl && (
        <div
          onClick={() => setViewUrl(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <img
            src={viewUrl}
            alt="document"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 10, boxShadow: '0 24px 64px rgba(0,0,0,0.6)', objectFit: 'contain' }}
          />
          <button
            onClick={() => setViewUrl(null)}
            style={{
              position: 'absolute', top: 20, right: 20,
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%',
              width: 42, height: 42, color: '#fff', cursor: 'pointer', fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
