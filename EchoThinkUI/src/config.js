/**
 * Configuração centralizada de URLs
 * Usa variáveis de ambiente do Vite
 */

const envBackendUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
const envApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export const BACKEND_URL = envBackendUrl || (envApiUrl.endsWith('/api') ? envApiUrl.slice(0, -4) : envApiUrl) || 'http://localhost:8000';
export const API_URL = envApiUrl || `${BACKEND_URL}/api`;

export const getImageUrl = (imagePath) => {
	const normalizedPath = String(imagePath || '').replace(/^\/+/, '');
	return `${BACKEND_URL}/media/img/${normalizedPath}`;
};
