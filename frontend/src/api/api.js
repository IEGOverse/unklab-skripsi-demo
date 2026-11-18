import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject token ke setiap request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 -> redirect login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const login = (data) => api.post('/login', data);

// Users
export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

// Students
export const getStudents = () => api.get('/students');
export const createStudent = (data) => api.post('/students', data);
export const updateStudent = (id, data) => api.put(`/students/${id}`, data);
export const deleteStudent = (id) => api.delete(`/students/${id}`);

// Lecturers
export const getLecturers = () => api.get('/lecturers');
export const createLecturer = (data) => api.post('/lecturers', data);
export const updateLecturer = (id, data) => api.put(`/lecturers/${id}`, data);
export const deleteLecturer = (id) => api.delete(`/lecturers/${id}`);

// Lecturer Expertise
export const getExpertise = () => api.get('/lecturer_expertise');
export const createExpertise = (data) => api.post('/lecturer_expertise', data);
export const updateExpertise = (id, data) => api.put(`/lecturer_expertise/${id}`, data);
export const deleteExpertise = (id) => api.delete(`/lecturer_expertise/${id}`);

// Theses
export const getTheses = () => api.get('/theses');
export const createThesis = (data) => api.post('/theses', data);
export const updateThesis = (id, data) => api.put(`/theses/${id}`, data);
export const deleteThesis = (id) => api.delete(`/theses/${id}`);

// Consultations
export const getConsultations = () => api.get('/consultations');
export const createConsultation = (data) => api.post('/consultations', data);
export const updateConsultation = (id, data) => api.put(`/consultations/${id}`, data);
export const deleteConsultation = (id) => api.delete(`/consultations/${id}`);

// Defense Requests
export const getDefenseRequests = () => api.get('/defense_requests');
export const createDefenseRequest = (data) => api.post('/defense_requests', data);
export const updateDefenseRequest = (id, data) => api.put(`/defense_requests/${id}`, data);
export const deleteDefenseRequest = (id) => api.delete(`/defense_requests/${id}`);

// Defense Schedules
export const getDefenseSchedules = () => api.get('/schedules');
export const createDefenseSchedule = (data) => api.post('/schedules', data);
export const checkScheduleConflict = (params) =>
  api.get('/schedules/check-conflict', { params });

// Faculty Rules (Dynamic Faculty Rules)
export const getFacultyRules = () => api.get('/faculty_rules');
export const updateFacultyRule = (id, data) => api.patch(`/faculty_rules/${id}`, data);

// Workflow Pengajuan Skripsi
export const getWorkflows = () => api.get('/workflow');
export const createWorkflow = (data) => api.post('/workflow', data);
export const updateWorkflow = (id, data) => api.patch(`/workflow/${id}`, data);

// AI
export const aiAnalyze = (data) => api.post('/ai/analyze', data);
export const aiRecommend = (params) => api.get('/ai/recommend', { params });

// Health
export const health = () => api.get('/health');
