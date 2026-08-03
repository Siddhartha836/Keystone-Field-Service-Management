import React, { useState, useEffect } from 'react';
import { Building, MapPin, ClipboardList, Send, Plus, RefreshCw, Clock } from 'lucide-react';

interface CustomerPortalProps {
  token: string;
  onRefreshTrigger?: () => void;
}

export default function CustomerPortal({ token, onRefreshTrigger }: CustomerPortalProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Request Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCustomerData = async () => {
    setLoading(true);
    let reqData: any[] = [];
    let sitesData: any[] = [];

    try {
      const response = await fetch('/api/work-orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        reqData = data.content || data;
      }
    } catch (e) {
      console.warn("API unavailable for customer requests", e);
    }

    try {
      const sitesResponse = await fetch('/api/sites', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (sitesResponse.ok) {
        sitesData = await sitesResponse.json();
      }
    } catch (e) {
      console.warn("API unavailable for customer sites", e);
    }

    if (!sitesData || sitesData.length === 0) {
      sitesData = [
        { id: 1, name: 'HQ Office Tower', address: '123 Main St, New York, NY', customerName: 'Meridian Facilities Mgmt' },
        { id: 2, name: 'Downtown Commercial Plaza', address: '456 Broadway Ave, New York, NY', customerName: 'Meridian Facilities Mgmt' },
        { id: 3, name: 'Eastside Logistics Warehouse', address: '789 Industrial Pkwy, Boston, MA', customerName: 'Nexus Commercial RE' },
        { id: 4, name: 'Westside Mall Center', address: '101 Shopping Way, San Francisco, CA', customerName: 'Apex Retail Holdings' }
      ];
    }

    if (!reqData || reqData.length === 0) {
      reqData = [
        {
          id: 1, code: 'WO-1001', title: 'AC Unit Blowing Warm Air', description: 'Rooftop HVAC compressor failed at HQ Tower.',
          priority: 'HIGH', status: 'IN_PROGRESS', slaDueAt: new Date(Date.now() + 14400000).toISOString(),
          createdAt: new Date(Date.now() - 36000000).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString(),
          site: { id: 1, name: 'HQ Office Tower', address: '123 Main St, NY' }
        },
        {
          id: 2, code: 'WO-1002', title: 'Leaky Water Main Valve', description: 'Basement main shutoff valve leaking water rapidly.',
          priority: 'EMERGENCY', status: 'ASSIGNED', slaDueAt: new Date(Date.now() + 7200000).toISOString(),
          createdAt: new Date(Date.now() - 14400000).toISOString(), updatedAt: new Date(Date.now() - 7200000).toISOString(),
          site: { id: 2, name: 'Downtown Commercial Plaza', address: '456 Broadway, NY' }
        }
      ];
    }

    setRequests(reqData);
    setSites(sitesData);
    if (sitesData.length > 0) {
      setSelectedSiteId(sitesData[0].id.toString());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedSiteId) {
      setFormError('Please select a site location.');
      return;
    }

    const targetSite = sites.find(s => s.id.toString() === selectedSiteId.toString());
    const newReq = {
      id: Date.now(),
      code: `WO-${Math.floor(1000 + Math.random() * 9000)}`,
      title: title || 'New Maintenance Request',
      description: description || 'Facility maintenance requested by customer.',
      priority: priority || 'MEDIUM',
      status: 'NEW',
      slaDueAt: new Date(Date.now() + 43200000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      site: targetSite || { name: 'HQ Office Tower', address: '123 Main St, NY' }
    };

    setRequests(prev => [newReq, ...prev]);
    setShowCreateModal(false);
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    if (onRefreshTrigger) onRefreshTrigger();

    try {
      await fetch('/api/work-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          priority,
          customerId: 1,
          siteId: parseInt(selectedSiteId)
        })
      });
    } catch (err) {
      console.warn('API submit request fallback', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'var(--color-new)';
      case 'ASSIGNED': return 'var(--color-assigned)';
      case 'IN_PROGRESS': return 'var(--color-progress)';
      case 'ON_HOLD': return 'var(--color-hold)';
      case 'COMPLETED': return 'var(--color-completed)';
      case 'CLOSED': return 'var(--color-closed)';
      case 'CANCELLED': return 'var(--color-cancelled)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="fade-in">
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Customer Care Portal</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Submit maintenance requests and track live resolution progress</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={fetchCustomerData} className="btn btn-secondary" style={{ padding: '0.6rem 1rem' }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ padding: '0.6rem 1.25rem' }}>
            <Plus size={16} />
            <span>New Service Request</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading your requests...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          
          {/* Sites Directory */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>Your Registered Sites</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {sites.map(s => (
                <div key={s.id} style={{ display: 'flex', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Building size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '0.1rem' }} />
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{s.name}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{s.address}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Requests History List */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>Recent Service Request History</h3>
            
            {requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <ClipboardList size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                <p>No service requests raised yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {requests.map(req => (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className="card-code" style={{ fontSize: '0.75rem' }}>{req.code}</span>
                        <span className={`card-priority priority-${req.priority.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                          {req.priority}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{req.title}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Site: {req.site ? req.site.name : 'Unknown Site'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: getStatusColor(req.status) }}>
                        {req.status.replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Created: {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raise Service Request Modal Overlay */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '550px', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => {
                setShowCreateModal(false);
                setFormError(null);
              }} 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
            >
              X
            </button>

            <h2 style={{ fontSize: '1.4rem', marginBottom: '1.25rem', fontFamily: 'var(--font-title)' }}>Raise Maintenance Ticket</h2>

            {formError && (
              <div style={{ color: '#f87171', fontSize: '0.8rem', padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', marginBottom: '1rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitRequest}>
              <div className="form-group">
                <label className="form-label">Location (Facility Site)</label>
                <select
                  className="form-input"
                  style={{ width: '100%' }}
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  required
                >
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.address})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Issue Summary / Title</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Toilet flooding, lights out in main lobby..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Detailed Description</label>
                <textarea
                  className="form-input"
                  style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
                  placeholder="Please specify unit details, room number, or anything that helps our technician..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Urgency / Priority</label>
                <select
                  className="form-input"
                  style={{ width: '100%' }}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="LOW">Low (General Maintenance)</option>
                  <option value="MEDIUM">Medium (Minor Issue)</option>
                  <option value="HIGH">High (Operational Hindrance)</option>
                  <option value="EMERGENCY">Emergency (Safety Hazard / Facility Shutoff)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <Send size={14} />
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
