import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../api/http';
import EndpointModal from '../components/EndpointModal';
import ConfirmModal from '../components/ConfirmModal';

// Mock sparkline generator for UI demo
const generateSparkline = () => {
  const points = Array.from({ length: 7 }, (_, i) => `${i * 12},${28 - (Math.random() * 20)}`).join(' ');
  return (
    <svg width="80" height="28" viewBox="0 0 80 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// Mock latency generator
const getLatency = (endpoint) => {
  if (!endpoint.isActive) return null;
  const val = Math.floor(Math.random() * 800) + 50; // 50 to 850
  let color = 'green';
  let pct = (val / 1000) * 100;
  if (val > 300) color = 'amber';
  if (val > 1000) { color = 'red'; pct = 100; }
  return { val, color, pct };
};

const EndpointsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const { data: endpoints = [], isLoading, error } = useQuery(['endpoints'], async () => {
    const { data } = await api.get('/endpoints');
    return data;
  });

  const createMutation = useMutation(
    async (newEndpoint) => {
      const { data } = await api.post('/endpoints', newEndpoint);
      return data;
    },
    {
      onMutate: async (newEndpoint) => {
        await queryClient.cancelQueries(['endpoints']);
        const previous = queryClient.getQueryData(['endpoints']);
        queryClient.setQueryData(['endpoints'], old => [{...newEndpoint, _id: Date.now().toString(), isActive: true}, ...(old || [])]);
        return { previous };
      },
      onError: (err, newEndpoint, context) => queryClient.setQueryData(['endpoints'], context.previous),
      onSettled: () => queryClient.invalidateQueries(['endpoints'])
    }
  );

  const updateMutation = useMutation(
    async ({ id, updated }) => {
      const { data } = await api.put(`/endpoints/${id}`, updated);
      return data;
    },
    {
      onMutate: async ({ id, updated }) => {
        await queryClient.cancelQueries(['endpoints']);
        const previous = queryClient.getQueryData(['endpoints']);
        queryClient.setQueryData(['endpoints'], old => old.map(e => e._id === id ? { ...e, ...updated } : e));
        return { previous };
      },
      onError: (err, vars, context) => queryClient.setQueryData(['endpoints'], context.previous),
      onSettled: () => queryClient.invalidateQueries(['endpoints'])
    }
  );

  const deleteMutation = useMutation(
    async (id) => {
      await api.delete(`/endpoints/${id}`);
    },
    {
      onMutate: async (id) => {
        await queryClient.cancelQueries(['endpoints']);
        const previous = queryClient.getQueryData(['endpoints']);
        queryClient.setQueryData(['endpoints'], old => old.filter(e => e._id !== id));
        return { previous };
      },
      onError: (err, id, context) => queryClient.setQueryData(['endpoints'], context.previous),
      onSettled: () => queryClient.invalidateQueries(['endpoints'])
    }
  );

  const handleOpenModal = (endpoint = null) => {
    setEditingId(endpoint?._id || null);
    setIsModalOpen(true);
  };

  const handleModalSubmit = (formData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, updated: formData });
    } else {
      createMutation.mutate(formData);
    }
    setIsModalOpen(false);
  };

  const handleToggleActive = (endpoint, e) => {
    e.stopPropagation(); // prevent row click
    updateMutation.mutate({ id: endpoint._id, updated: { isActive: !endpoint.isActive } });
  };

  const handleDeleteClick = (endpoint, e) => {
    e.stopPropagation();
    setDeleteConfirmId(endpoint._id);
  };

  const handleEditClick = (endpoint, e) => {
    e.stopPropagation();
    handleOpenModal(endpoint);
  };

  const handleRowClick = (id) => {
    navigate(`/endpoints/${id}`);
  };

  if (isLoading) return <div className="page loading-text">Loading monitors…</div>;
  if (error) return <div className="page error-text">Failed to fetch monitors.</div>;

  return (
    <div className="page fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Monitors</h1>
          <p className="page-subtitle">
            {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          + Add Monitor
        </button>
      </div>

      {endpoints.length === 0 ? (
        <div className="table-container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📡</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            No monitors configured yet
          </p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
            Click "Add Monitor" to start tracking your first API endpoint
          </p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="endpoints-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Name</th>
                  <th>Target URL</th>
                  <th>Method</th>
                  <th>Interval</th>
                  <th style={{ width: '150px' }}>Latency</th>
                  <th>7-Day</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map(endpoint => {
                  const latency = getLatency(endpoint);
                  return (
                    <tr key={endpoint._id} className="table-row-clickable" onClick={() => handleRowClick(endpoint._id)}>
                      <td>
                        <span className={`status-badge ${endpoint.isActive ? 'badge-active pulsing-dot' : 'badge-paused'}`}>
                          {endpoint.isActive ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="font-semibold">{endpoint.name}</td>
                      <td className="url-cell">{endpoint.url}</td>
                      <td><span className="method-badge">{endpoint.method}</span></td>
                      <td><span className="interval-txt">{endpoint.intervalMinutes}m</span></td>
                      <td>
                        {latency ? (
                          <div className="latency-cell">
                            <span className="latency-value" style={{ color: `var(--${latency.color === 'green' ? 'success' : latency.color === 'amber' ? 'warning' : 'error'}-text)` }}>
                              {latency.val}ms
                            </span>
                            <div className="latency-track-bg">
                              <div className={`latency-track-fill ${latency.color}`} style={{ width: `${latency.pct}%` }} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>{generateSparkline()}</td>
                      <td className="actions-cell">
                        <button className="btn-text" onClick={(e) => handleToggleActive(endpoint, e)}>
                          {endpoint.isActive ? 'Pause' : 'Resume'}
                        </button>
                        <button className="btn-text" onClick={(e) => handleEditClick(endpoint, e)}>Edit</button>
                        <button className="btn-text text-danger" onClick={(e) => handleDeleteClick(endpoint, e)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {endpoints.length === 1 && (
            <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: '1.5rem' }}>
              Add more endpoints to monitor your full system →
            </p>
          )}
        </>
      )}

      <EndpointModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleModalSubmit}
        initialData={editingId ? endpoints.find(e => e._id === editingId) : null}
      />

      <ConfirmModal 
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          deleteMutation.mutate(deleteConfirmId);
          setDeleteConfirmId(null);
        }}
        title="Delete Monitor"
        message="Are you sure you want to permanently delete this monitor and all its history? This action cannot be undone."
      />
    </div>
  );
};

export default EndpointsPage;
