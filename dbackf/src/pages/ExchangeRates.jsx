import React, { useEffect, useState } from 'react';
import api from '../services/api';

function ExchangeRates() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const todayRate = rates.find(r => r.date === today);
  const [rateValue, setRateValue] = useState('');

  useEffect(() => {
    if (todayRate) setRateValue(todayRate.rate);
    else setRateValue('');
  }, [todayRate]);

  useEffect(() => {
    api.get('exchange-rates/')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setRates(data);
      })
      .catch(() => {
        setRates([]);
        setError('No se pudo cargar la lista de tasas.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    if (!rateValue || isNaN(rateValue)) {
      setFormError('La tasa es obligatoria y debe ser numérica.');
      setFormLoading(false);
      return;
    }
    try {
      if (todayRate) {
        await api.put(`exchange-rates/${todayRate.id}/`, { date: today, rate: rateValue });
      } else {
        await api.post('exchange-rates/', { date: today, rate: rateValue });
      }
      api.get('exchange-rates/').then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setRates(data);
      });
    } catch (err) {
      setFormError('Error al guardar la tasa.');
    }
    setFormLoading(false);
  };

  return (
    <div className="container py-5">
      <h1 className="display-5 mb-4 text-info">Tasas de Cambio</h1>
      <form className="bg-white p-4 rounded shadow mb-4" style={{maxWidth: 400}} onSubmit={handleSubmit}>
        <h2 className="mb-3">Tasa de hoy ({today})</h2>
        <div className="mb-3">
          <input
            type="number"
            className="form-control"
            placeholder="Tasa de cambio"
            value={rateValue}
            onChange={e => setRateValue(e.target.value)}
            required
            min="0"
            step="0.0001"
          />
        </div>
        {formError && <div className="alert alert-danger mb-2">{formError}</div>}
        <button type="submit" className="btn btn-info" disabled={formLoading}>
          {todayRate ? 'Editar tasa' : 'Guardar tasa'}
        </button>
      </form>
      {loading && <div className="text-center text-secondary">Cargando...</div>}
      {!loading && error && <div className="text-center text-danger">{error}</div>}
      {!loading && !error && (
        <table className="table table-bordered table-hover">
          <thead className="table-info">
            <tr>
              <th>Fecha</th>
              <th>Tasa</th>
            </tr>
          </thead>
          <tbody>
            {rates.map(r => (
              <tr key={r.id}>
                <td>{r.date}</td>
                <td>{r.rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ExchangeRates;
