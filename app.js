import API from './api.js';
import Charts from './charts.js';
import { calculateBill, estimateMonthlyBill } from './calculator.js';

/**
 * Main Application Controller
 */
const App = {
    // Refresh interval in milliseconds (15 seconds)
    REFRESH_INTERVAL: 15000,

    // State variables for fetching and retry backoff
    isFetching: false,
    retryAttempts: 0,
    maxRetries: 3,
    retryTimeoutId: null,

    /**
     * Initialize the application
     */
    init() {
        Charts.init();
        this.loadSettings();
        this.bindEvents();
        this.init3DTilt();
        this.updateDashboard();
        this.startAutoRefresh();
    },

    /**
     * Fetch and update dashboard with latest data
     */
    async updateDashboard() {
        if (this.isFetching) {
            // Fetch already in progress, skip update.
            return;
        }

        if (this.retryTimeoutId) {
            clearTimeout(this.retryTimeoutId);
            this.retryTimeoutId = null;
        }

        this.isFetching = true;
        this.updateStatus('Syncing', 'status-syncing');

        try {
            const data = await API.fetchTelemetryFeed(20);
            if (data && data.feeds && data.feeds.length > 0) {
                const latestData = data.feeds[data.feeds.length - 1];

                // Calculate current slab bill based on cumulative units (field4)
                const units = latestData.field4 ? parseFloat(latestData.field4) : 0;
                const currentBill = calculateBill(units);

                // Calculate average power (field3) over the feed entries to estimate monthly bill
                let totalPower = 0;
                let powerCount = 0;
                data.feeds.forEach(feed => {
                    if (feed.field3) {
                        const val = parseFloat(feed.field3);
                        if (!isNaN(val)) {
                            totalPower += val;
                            powerCount++;
                        }
                    }
                });
                const avgPower = powerCount > 0 ? (totalPower / powerCount) : 0;
                const projection = estimateMonthlyBill(avgPower);

                // Render metrics to DOM
                this.renderData(latestData, currentBill, projection.estimatedMonthlyBill);
                
                // Update charts
                Charts.update(data.feeds);
            }
            this.updateStatus('Online', 'status-online');
            this.resetCountdownProgress();
            this.retryAttempts = 0; // Reset retry counter on success
            this.clearStaleState();
        } catch (error) {
            console.error('Error updating dashboard:', error);
            this.handleFetchError();
        } finally {
            this.isFetching = false;
        }
    },

    /**
     * Resets the countdown animation on refresh bars to synchronize with API requests
     */
    resetCountdownProgress() {
        const elements = document.querySelectorAll('.refresh-bar-fill');
        elements.forEach(el => {
            el.style.animation = 'none';
            // Trigger reflow
            void el.offsetWidth;
            el.style.animation = 'countdown 15s linear infinite';
        });
    },

    /**
     * Update the DOM elements with sensor values
     * @param {Object} data - The feed data from ThingSpeak
     * @param {number} currentBill - Calculated current slab bill
     * @param {number} estimatedMonthlyBill - Projected monthly bill
     */
    renderData(data, currentBill = 0, estimatedMonthlyBill = 0) {
        // Map ThingSpeak fields to dashboard elements
        // Adjust these mappings based on your ThingSpeak configuration
        const mappings = {
            'voltage-val': data.field1 ? parseFloat(data.field1).toFixed(2) : '--',
            'current-val': data.field2 ? parseFloat(data.field2).toFixed(2) : '--',
            'power-val': data.field3 ? parseFloat(data.field3).toFixed(2) : '--',
            'energy-val': data.field4 ? parseFloat(data.field4).toFixed(3) : '--',
            'bill-val': currentBill > 0 ? currentBill.toFixed(2) : '0.00',
            'monthly-bill-val': estimatedMonthlyBill > 0 ? estimatedMonthlyBill.toFixed(2) : '0.00',
            'last-update': new Date(data.created_at).toLocaleString()
        };

        for (const [id, value] of Object.entries(mappings)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                element.classList.remove('skeleton');
                element.classList.remove('stale');
            }
        }
    },

    /**
     * Handle failed telemetry updates using exponential backoff retry scheduling
     */
    handleFetchError() {
        this.applyStaleState();

        if (this.retryAttempts < this.maxRetries) {
            this.retryAttempts++;
            const delay = Math.pow(2, this.retryAttempts) * 1000;
            console.warn(`Fetch failed. Retrying in ${delay / 1000}s (Attempt ${this.retryAttempts}/${this.maxRetries})...`);
            this.updateStatus(`Retrying (${this.retryAttempts}/${this.maxRetries})`, 'status-syncing');
            
            this.retryTimeoutId = setTimeout(() => {
                this.retryTimeoutId = null;
                this.updateDashboard();
            }, delay);
        } else {
            console.error('Maximum retry attempts reached. Device/network is offline.');
            this.updateStatus('Offline / Error', 'status-offline');
        }
    },

    /**
     * Apply stale formatting (dimming) to all telemetry value elements
     */
    applyStaleState() {
        const ids = ['voltage-val', 'current-val', 'power-val', 'energy-val', 'bill-val', 'monthly-bill-val'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.add('stale');
            }
        });
    },

    /**
     * Remove stale formatting from all telemetry value elements
     */
    clearStaleState() {
        const ids = ['voltage-val', 'current-val', 'power-val', 'energy-val', 'bill-val', 'monthly-bill-val'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('stale');
            }
        });
    },

    /**
     * Update the connection status indicator
     */
    updateStatus(text, className) {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            statusEl.textContent = text;
            statusEl.className = `status-badge ${className}`;
        }
    },

    /**
     * Start the auto-refresh timer
     */
    startAutoRefresh() {
        setInterval(() => {
            this.updateDashboard();
        }, this.REFRESH_INTERVAL);
    },

    /**
     * Load settings from localStorage to prepopulate settings inputs
     */
    loadSettings() {
        const savedTariff = localStorage.getItem('billing_tariff_rate');
        const tariffInput = document.getElementById('tariff-input');
        if (tariffInput) {
            tariffInput.value = savedTariff !== null ? savedTariff : '8.0';
        }

        const channelInput = document.getElementById('channel-id-input');
        const readKeyInput = document.getElementById('read-key-input');

        if (channelInput) channelInput.value = localStorage.getItem('thingspeak_channel_id') || '';
        if (readKeyInput) readKeyInput.value = localStorage.getItem('thingspeak_read_api_key') || '';
    },

    /**
     * Bind click events to settings actions
     */
    bindEvents() {
        const saveTariffBtn = document.getElementById('save-tariff-btn');
        if (saveTariffBtn) {
            saveTariffBtn.addEventListener('click', () => {
                const tariffInput = document.getElementById('tariff-input');
                if (tariffInput) {
                    const val = parseFloat(tariffInput.value);
                    if (isNaN(val) || val <= 0) {
                        alert('Please enter a valid tariff rate (Rs/kWh) greater than 0.');
                        return;
                    }
                    localStorage.setItem('billing_tariff_rate', val.toFixed(1));
                    alert('Tariff rate saved successfully.');
                }
            });
        }

        const saveApiBtn = document.getElementById('save-api-btn');
        if (saveApiBtn) {
            saveApiBtn.addEventListener('click', () => {
                const channelInput = document.getElementById('channel-id-input');
                const readKeyInput = document.getElementById('read-key-input');
                if (channelInput && readKeyInput) {
                    const channelVal = channelInput.value.trim();
                    const readKeyVal = readKeyInput.value.trim();

                    if (!channelVal && !readKeyVal) {
                        localStorage.removeItem('thingspeak_channel_id');
                        localStorage.removeItem('thingspeak_read_api_key');
                        alert('ThingSpeak credentials reset to system defaults. Reloading...');
                        this.loadSettings();
                        this.updateDashboard();
                        return;
                    }

                    if (!channelVal || !readKeyVal) {
                        alert('Please fill out both ThingSpeak Channel ID and Read API Key (or clear both to reset to default).');
                        return;
                    }

                    localStorage.setItem('thingspeak_channel_id', channelVal);
                    localStorage.setItem('thingspeak_read_api_key', readKeyVal);
                    alert('ThingSpeak credentials saved. Reloading dashboard feed...');
                    this.updateDashboard();
                }
            });
        }
    },

    /**
     * Set up dynamic 3D tilting effect on cards
     */
    init3DTilt() {
        // Skip 3D card tilt tracking on mobile/touch screens to avoid UX issues
        if (window.matchMedia('(max-width: 768px)').matches || ('ontouchstart' in window) || navigator.maxTouchPoints > 0) {
            return;
        }

        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = -(y - centerY) / (rect.height / 16);
                const rotateY = (x - centerX) / (rect.width / 16);
                
                // Fast tracking during hover, slow settle on leave
                card.style.transition = 'transform 0.08s ease-out';
                card.style.transform = `translateY(-6px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(15px)`;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transition = 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)';
                card.style.transform = '';
            });
        });
    }
};

// Initialize App when DOM is loaded
document.addEventListener('DOMContentLoaded', () => App.init());
