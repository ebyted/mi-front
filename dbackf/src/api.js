import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8030/', // Esta es la URL base a la API de Django
  // ...otros settings
});

export default api;