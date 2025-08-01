import React, { useState } from "react";
import ElegantLayout from "../components/ElegantLayout";
import AppNavbar from "../components/AppNavbar";

const ExchangeRate = () => {
  const [currency, setCurrency] = useState("");
  const [rate, setRate] = useState("");
  const [date, setDate] = useState("");
  const [details, setDetails] = useState([]);

  const handleAddDetail = () => {
    if (currency && rate && date) {
      setDetails([...details, { currency, rate, date }]);
      setCurrency("");
      setRate("");
      setDate("");
    }
  };

  return (
    <ElegantLayout>
      <AppNavbar />
      <div className="container mt-4">
        <h2 className="mb-4">Tipo de Cambio</h2>
        <div className="row mb-3">
          <div className="col-md-4">
            <select
              className="form-select"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
            >
              <option value="">Moneda</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="MXN">MXN</option>
            </select>
          </div>
          <div className="col-md-4">
            <input
              type="number"
              className="form-control"
              placeholder="Tipo de cambio"
              value={rate}
              onChange={e => setRate(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <input
              type="date"
              className="form-control"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        </div>
        <button className="btn btn-primary mb-3" onClick={handleAddDetail}>
          Agregar
        </button>
        <div className="card">
          <div className="card-header">Detalles</div>
          <ul className="list-group list-group-flush">
            {details.map((d, idx) => (
              <li key={idx} className="list-group-item">
                {d.currency} - {d.rate} - {d.date}
              </li>
            ))}
            {details.length === 0 && (
              <li className="list-group-item text-muted">Sin detalles</li>
            )}
          </ul>
        </div>
      </div>
    </ElegantLayout>
  );
};

export default ExchangeRate;
