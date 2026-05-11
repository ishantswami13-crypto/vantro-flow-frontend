import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function CameraScanner({ scanType = 'invoice', onExtracted, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [phase, setPhase] = useState('camera'); // 'camera' | 'preview' | 'scanning' | 'result' | 'error'
  const [capturedImage, setCapturedImage] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (e) {
      setCameraError('Camera access denied. Please allow camera permission and try again.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    setPhase('preview');
  };

  const retake = () => {
    setCapturedImage(null);
    setExtracted(null);
    setPhase('camera');
    startCamera();
  };

  const scan = async () => {
    setPhase('scanning');
    try {
      const res = await axios.post(`${API_BASE}/api/scan-document`, {
        image_base64: capturedImage,
        scan_type: scanType
      });
      setExtracted(res.data.extracted);
      setPhase('result');
    } catch (e) {
      setErrorMsg(e.response?.data?.error || 'Scan failed. Try again with a clearer image.');
      setPhase('error');
    }
  };

  const handleConfirm = () => {
    if (onExtracted) onExtracted(extracted);
    onClose();
  };

  const labels = scanType === 'supplier'
    ? { title: 'Scan Supplier Card / Document', fields: [
        { key: 'name', label: 'Supplier Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'address', label: 'Address' },
        { key: 'payment_terms', label: 'Payment Terms (days)' },
      ]}
    : { title: 'Scan Invoice / Bill', fields: [
        { key: 'customer_name', label: 'Customer Name' },
        { key: 'customer_phone', label: 'Phone' },
        { key: 'invoice_amount', label: 'Amount (₹)' },
        { key: 'invoice_date', label: 'Date' },
        { key: 'items', label: 'Items' },
      ]};

  return (
    <div className="scanner-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="scanner-modal">
        <div className="scanner-header">
          <h3>📷 {labels.title}</h3>
          <button className="scanner-close" onClick={onClose}>✕</button>
        </div>

        {/* CAMERA PHASE */}
        {phase === 'camera' && (
          <div className="scanner-camera-wrap">
            {cameraError
              ? <div className="scanner-cam-error">{cameraError}</div>
              : <>
                  <video ref={videoRef} className="scanner-video" playsInline muted autoPlay />
                  <div className="scanner-frame">
                    <div className="scanner-corner tl" /><div className="scanner-corner tr" />
                    <div className="scanner-corner bl" /><div className="scanner-corner br" />
                  </div>
                  <p className="scanner-hint">Point camera at the {scanType === 'supplier' ? 'supplier card/document' : 'invoice/bill'}</p>
                  <button className="scanner-capture-btn" onClick={capture}>📸 Capture</button>
                </>
            }
          </div>
        )}

        {/* PREVIEW PHASE */}
        {phase === 'preview' && (
          <div className="scanner-preview-wrap">
            <img src={capturedImage} alt="Captured" className="scanner-preview-img" />
            <div className="scanner-preview-actions">
              <button className="scanner-retake-btn" onClick={retake}>🔄 Retake</button>
              <button className="scanner-scan-btn" onClick={scan}>🤖 Extract Data</button>
            </div>
          </div>
        )}

        {/* SCANNING PHASE */}
        {phase === 'scanning' && (
          <div className="scanner-scanning">
            <div className="scanner-spin" />
            <p>AI is reading the document...</p>
          </div>
        )}

        {/* RESULT PHASE */}
        {phase === 'result' && extracted && (
          <div className="scanner-result">
            <p className="scanner-result-title">✅ Data extracted — review and confirm:</p>
            <div className="scanner-fields">
              {labels.fields.map(f => (
                <div key={f.key} className="scanner-field">
                  <label>{f.label}</label>
                  <input
                    value={extracted[f.key] || ''}
                    onChange={e => setExtracted(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={`Enter ${f.label}`}
                  />
                </div>
              ))}
            </div>
            <div className="scanner-result-actions">
              <button className="scanner-retake-btn" onClick={retake}>🔄 Scan Again</button>
              <button className="scanner-confirm-btn" onClick={handleConfirm}>✅ Add to {scanType === 'supplier' ? 'Suppliers' : 'Invoices'}</button>
            </div>
          </div>
        )}

        {/* ERROR PHASE */}
        {phase === 'error' && (
          <div className="scanner-scanning">
            <p style={{color:'#dc2626', marginBottom:'1rem'}}>❌ {errorMsg}</p>
            <button className="scanner-retake-btn" onClick={retake}>🔄 Try Again</button>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}

export default CameraScanner;
