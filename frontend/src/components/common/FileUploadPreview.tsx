import React, { useState } from 'react';
import { UploadCloud, FileText, Trash2, Eye, CheckCircle2 } from 'lucide-react';
import { Modal } from './Overlays';

export interface FileUploadProps {
  onUpload: (file: File) => Promise<any> | void | any;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  helperText?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.csv,.xlsx',
  maxSizeMB = 10,
  label = 'Upload Document or Proof',
  helperText = `Accepted: PDF, DOC, CSV, XLSX, PNG (up to ${maxSizeMB}MB)`,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileSelect = async (selected: File) => {
    setError(null);
    setSuccess(false);
    if (selected.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB limit.`);
      return;
    }
    setFile(selected);
    setUploading(true);
    try {
      await onUpload(selected);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to process file upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ margin: '12px 0' }}>
      {label && <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>{label}</label>}
      <div
        className="glass-card"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
          }
        }}
        style={{
          border: isDragging ? '2px dashed var(--color-primary)' : '2px dashed var(--border-glass)',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          background: isDragging ? 'hsla(var(--hue-primary), 75%, 35%, 0.06)' : 'var(--bg-glass)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onClick={() => document.getElementById('file-upload-input')?.click()}
      >
        <input
          id="file-upload-input"
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && e.target.files.length > 0 && handleFileSelect(e.target.files[0])}
        />

        {file ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <FileText size={32} color="var(--color-primary)" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>{file.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</div>
            </div>
            {uploading ? (
              <span className="badge badge-info" style={{ marginLeft: '12px' }}>
                Uploading...
              </span>
            ) : success ? (
              <span className="badge badge-success" style={{ marginLeft: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} /> Attached
              </span>
            ) : null}
            <button
              type="button"
              className="btn-icon"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setSuccess(false);
              }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'hsl(0, 80%, 55%)' }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <UploadCloud size={36} color="var(--color-primary)" />
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
              Click or drag file to attach
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{helperText}</div>
          </>
        )}
      </div>
      {error && <div style={{ fontSize: '12px', color: 'hsl(0, 80%, 55%)', marginTop: '6px', fontWeight: 600 }}>{error}</div>}
    </div>
  );
};

export interface FilePreviewProps {
  url: string | null;
  fileName: string;
  onClose: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ url, fileName, onClose }) => {
  if (!url) return null;

  const isImg = /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName || url);

  return (
    <Modal open={!!url} title={`Preview: ${fileName}`} onClose={onClose} maxWidth="800px">
      <div style={{ textAlign: 'center', minHeight: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-glass)', borderRadius: '12px', padding: '16px' }}>
        {isImg ? (
          <img src={url} alt={fileName} style={{ maxWidth: '100%', maxHeight: '560px', objectFit: 'contain', borderRadius: '8px' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <FileText size={56} color="var(--color-primary)" />
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>{fileName}</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>This document format can be downloaded for full verification.</p>
            <a href={url} download={fileName} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Eye size={16} /> Open / Download File
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
};
