import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRepairHistory } from '../lib/api/repairApi';
import { RepairTicket } from '../types';
import { buildStatusClass, formatDate } from '../lib/utils/format';

export function HistoryPage() {
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      setError(null);
      setLoading(true);
      try {
        const data = await getRepairHistory(search);
        setRepairs(data);
      } catch (err) {
        setError('Unable to load repair history.');
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [search]);

  return (
    <div>
      <h2 className="page-title">Repair History</h2>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="input-group">
          <label className="label" htmlFor="historySearch">
            Search history
          </label>
          <input
            id="historySearch"
            className="input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by repair #, vehicle, or driver"
          />
        </div>
      </div>
      <div className="card">
        {loading ? (
          <p>Loading completed repairs…</p>
        ) : error ? (
          <div className="alert">{error}</div>
        ) : repairs.length === 0 ? (
          <p>No history records available.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Repair #</th>
                <th>Vehicle</th>
                <th>Status</th>
                <th>Closed At</th>
              </tr>
            </thead>
            <tbody>
              {repairs.map((repair) => (
                <tr key={repair.id}>
                  <td>
                    <Link to={`/repairs/${repair.id}`} style={{ color: '#1d4ed8' }}>
                      {repair.repairNumber}
                    </Link>
                  </td>
                  <td>{repair.vehiclePlate}</td>
                  <td>
                    <span className={buildStatusClass(repair.status)}>
                      {repair.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{formatDate(repair.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
