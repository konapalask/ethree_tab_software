/**
 * Central API Configuration
 * 
 * Uses the VITE_API_URL environment variable if provided, 
 * otherwise defaults to the local ngrok server.
 */

const envApiUrl = import.meta.env.VITE_API_URL;

// Default production server endpoint
const LOCAL_BACKEND = 'https://e3-e4-backend.ethree.in'; 

// Always default to local server endpoint unless explicitly overridden via ENV
export const API_URL = envApiUrl || LOCAL_BACKEND;

/**
 * Image Base URL
 * 
 * We now use a Vercel proxy (/images) to fetch assets from the local server.
 * This bypasses ngrok browser warnings and browser security blocks.
 */
export const IMAGE_URL = '/images';

export default API_URL;
