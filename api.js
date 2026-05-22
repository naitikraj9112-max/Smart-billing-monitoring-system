import CONFIG from './config.js';

/**
 * API Service for ThingSpeak
 */
const API = {
    /**
     * Fetches the latest feed from ThingSpeak
     * @returns {Promise<Object>} The latest feed data
     */
    async fetchLatestData() {
        const url = `${CONFIG.BASE_URL}/channels/${CONFIG.CHANNEL_ID}/feeds.json?api_key=${CONFIG.READ_API_KEY}&results=1`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.feeds && data.feeds.length > 0) {
                return data.feeds[0];
            } else {
                throw new Error('No data found in feeds');
            }
        } catch (error) {
            console.error('Error fetching data from ThingSpeak:', error);
            throw error;
        }
    },

    /**
     * Fetches the latest multiple feeds from ThingSpeak to display historical data
     * @param {number} resultsCount - The number of feed entries to retrieve
     * @returns {Promise<Object>} The complete channel and feed data
     */
    async fetchTelemetryFeed(resultsCount = 20) {
        const url = `${CONFIG.BASE_URL}/channels/${CONFIG.CHANNEL_ID}/feeds.json?api_key=${CONFIG.READ_API_KEY}&results=${resultsCount}`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.feeds && data.feeds.length > 0) {
                return data;
            } else {
                throw new Error('No data found in feeds');
            }
        } catch (error) {
            console.error(`Error fetching telemetry feeds (results=${resultsCount}) from ThingSpeak:`, error);
            throw error;
        }
    }
};

export default API;
