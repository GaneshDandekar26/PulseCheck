import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../api/http';
import EndpointModal from '../components/EndpointModal';
import ConfirmModal from '../components/ConfirmModal';

const EndpointsPage = () => {
  const queryClient = useQueryClient();
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

  const handleToggleActive = (endpoint) => {
    updateMutation.mutate({ id: endpoint._id, updated: { isActive: !endpoint.isActive } });
  };

  if (isLoading) return <div className="page loading-text">Loading monitors...</div>;
  if (error) return <div className="page error-text">Failed to fetch monitors.</div>;

  return (
    <div className="page fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Monitors</h1>
          <p className="page-subtitle">Manage your API health checks.</p>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>+ Add Monitor</button>
      </div>

      <div className="table-container">
        <table className="endpoints-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Name</th>
              <th>Target URL</th>
              <th>Method</th>
              <th>Interval</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.length === 0 ? (
              <tr><td colSpan="6" className="text-center text-muted" style={{padding: '3rem'}}>No monitors found. Create one!</td></tr>
            ) : endpoints.map(endpoint => (
              <tr key={endpoint._id}>
                <td>
                  <span className={`status-badge ${endpoint.isActive ? 'badge-active' : 'badge-paused'}`}>
                    {endpoint.isActive ? 'Active' : 'Paused'}
                  </span>
                </td>
                <td className="font-semibold">{endpoint.name}</td>
                <td className="text-muted url-cell">{endpoint.url}</td>
                <td><span className="method-badge">{endpoint.method}</span></td>
                <td><span className="interval-txt">{endpoint.intervalMinutes}m</span></td>
                <td className="actions-cell">
                  <Link to={`/endpoints/${endpoint._id}`} className="btn-text" style={{ textDecoration: 'none' }}>View</Link>
                  <button className="btn-text" onClick={() => handleToggleActive(endpoint)}>
                    {endpoint.isActive ? 'Pause' : 'Resume'}
                  </button>
                  <button className="btn-text" onClick={() => handleOpenModal(endpoint)}>Edit</button>
                  <button className="btn-text text-danger" onClick={() => setDeleteConfirmId(endpoint._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
        message="Are you sure you want to permanently delete this monitor and all its history?"
      />
    </div>
  );
};

export default EndpointsPage;
