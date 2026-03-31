import { useState, useEffect } from 'react';

const EndpointModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    method: 'GET',
    intervalMinutes: 5,
    thresholdMs: 1000,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        url: initialData.url || '',
        method: initialData.method || 'GET',
        intervalMinutes: initialData.intervalMinutes || 5,
        thresholdMs: initialData.thresholdMs || 1000,
      });
    } else {
      setFormData({ name: '', url: '', method: 'GET', intervalMinutes: 5, thresholdMs: 1000 });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      intervalMinutes: Number(formData.intervalMinutes),
      thresholdMs: Number(formData.thresholdMs),
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>{initialData ? 'Edit Monitor' : 'Add New Monitor'}</h2>
        <form onSubmit={handleSubmit} className="crud-form">
          <label>
            Monitor Name
            <input 
              type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
              required placeholder="Production API" 
            />
          </label>
          <label>
            Target URL
            <input 
              type="url" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} 
              required placeholder="https://api.example.com/health" 
            />
          </label>
          <label>
            HTTP Method
            <select value={formData.method} onChange={e => setFormData({...formData, method: e.target.value})}>
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <label>
              Interval (Minutes)
              <input 
                type="number" min="1" value={formData.intervalMinutes} 
                onChange={e => setFormData({...formData, intervalMinutes: e.target.value})} required 
              />
            </label>
            <label>
              Timeout Threshold (ms)
              <input 
                type="number" min="10" value={formData.thresholdMs} 
                onChange={e => setFormData({...formData, thresholdMs: e.target.value})} required 
              />
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Save Monitor</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EndpointModal;
