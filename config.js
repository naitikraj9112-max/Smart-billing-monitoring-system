/**
 * ThingSpeak Configuration
 * Resolves properties dynamically checking localStorage first, falling back to default credentials.
 */
const CONFIG = {
    get CHANNEL_ID() {
        return localStorage.getItem('thingspeak_channel_id') || '3391644';
    },
    get READ_API_KEY() {
        return localStorage.getItem('thingspeak_read_api_key') || '04IU1CDM176ZZ0CT';
    },
    get WRITE_API_KEY() {
        return localStorage.getItem('thingspeak_write_api_key') || '8KJ0ET7K5R0QICEW';
    },
    get TARIFF_RATE() {
        const val = parseFloat(localStorage.getItem('billing_tariff_rate'));
        return isNaN(val) ? 8.0 : val;
    },
    BASE_URL: 'https://api.thingspeak.com'
};

export default CONFIG;
