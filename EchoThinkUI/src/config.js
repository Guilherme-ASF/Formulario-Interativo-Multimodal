/**
 * Configuração centralizada de URLs
 * Usa variáveis de ambiente do Vite
 */

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const getImageUrl = (imagePath) => `${BACKEND_URL}/media/img/${imagePath}`;
