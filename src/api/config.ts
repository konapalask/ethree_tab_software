/**
 * Central API Configuration
 * 
 * Uses the VITE_API_URL environment variable if provided, 
 * otherwise defaults to the local ngrok server.
 */

const envApiUrl = import.meta.env.VITE_API_URL;

// Default local server endpoint (ngrok tunnel)
const LOCAL_BACKEND = 'https://swampland-situated-barbell.ngrok-free.dev'; 

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
