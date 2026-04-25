import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API });

export const api = {
  listEvaluations: (params = {}) => client.get("/evaluations", { params }).then((r) => r.data),
  getEvaluation: (id) => client.get(`/evaluations/${id}`).then((r) => r.data),
  createEvaluation: (data) => client.post("/evaluations", data).then((r) => r.data),
  updateEvaluation: (id, data) => client.put(`/evaluations/${id}`, data).then((r) => r.data),
  deleteEvaluation: (id) => client.delete(`/evaluations/${id}`).then((r) => r.data),
  stats: () => client.get("/stats").then((r) => r.data),
};
