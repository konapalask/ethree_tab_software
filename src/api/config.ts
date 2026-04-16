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
 * In most local setups with ngrok, assets are served from the root.
 * We remove the '/images' prefix to avoid 404s if the backend
 * serves static files from a 'public' directory.
 */
export const IMAGE_URL = API_URL;

export default API_URL;
