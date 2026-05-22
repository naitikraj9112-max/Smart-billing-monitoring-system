/**
 * Charts module for Smart Bill Monitoring System
 * Wraps Chart.js initialization, rendering, and dynamic updates
 */

// Colors matching style.css CSS variables
const COLORS = {
    voltage: '#0ea5e9',
    voltageGlow: 'rgba(14, 165, 233, 0.15)',
    power: '#10b981',
    powerGlow: 'rgba(16, 185, 129, 0.15)',
    units: '#8b5cf6',
    unitsGlow: 'rgba(139, 92, 246, 0.15)',
    gridLines: 'rgba(0, 0, 0, 0.05)',
    text: '#64748b'
};

const Charts = {
    powerChart: null,
    voltageChart: null,
    energyChart: null,

    /**
     * Initializes all charts present on the current page.
     * Checks for canvas existence before trying to create.
     */
    init() {
        // Define common chart styling configuration
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Hide legend to match clean UI
                },
                tooltip: {
                    backgroundColor: '#ffffff',
                    titleColor: '#1e293b',
                    bodyColor: '#64748b',
                    borderColor: 'rgba(0, 0, 0, 0.05)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    displayColors: false,
                    bodyFont: {
                        family: 'Outfit, sans-serif'
                    },
                    titleFont: {
                        family: 'Outfit, sans-serif',
                        weight: 'bold'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: COLORS.gridLines,
                        borderColor: COLORS.gridLines
                    },
                    ticks: {
                        color: COLORS.text,
                        font: {
                            family: 'Outfit, sans-serif',
                            size: 11
                        }
                    }
                },
                y: {
                    grid: {
                        color: COLORS.gridLines,
                        borderColor: COLORS.gridLines
                    },
                    ticks: {
                        color: COLORS.text,
                        font: {
                            family: 'Outfit, sans-serif',
                            size: 11
                        }
                    }
                }
            }
        };

        // 1. Power Chart
        const powerCanvas = document.getElementById('power-chart');
        if (powerCanvas && !this.powerChart) {
            this.powerChart = new Chart(powerCanvas, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Power Draw (W)',
                        data: [],
                        borderColor: COLORS.power,
                        backgroundColor: (context) => {
                            const chart = context.chart;
                            const {ctx, chartArea} = chart;
                            if (!chartArea) return null;
                            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
                            gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
                            return gradient;
                        },
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointBackgroundColor: COLORS.power,
                        pointBorderColor: '#ffffff',
                        pointHoverRadius: 6
                    }]
                },
                options: commonOptions
            });
        }

        // 2. Voltage Chart
        const voltageCanvas = document.getElementById('voltage-chart');
        if (voltageCanvas && !this.voltageChart) {
            this.voltageChart = new Chart(voltageCanvas, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Voltage (V)',
                        data: [],
                        borderColor: COLORS.voltage,
                        backgroundColor: (context) => {
                            const chart = context.chart;
                            const {ctx, chartArea} = chart;
                            if (!chartArea) return null;
                            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                            gradient.addColorStop(0, 'rgba(14, 165, 233, 0.3)');
                            gradient.addColorStop(1, 'rgba(14, 165, 233, 0.0)');
                            return gradient;
                        },
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointBackgroundColor: COLORS.voltage,
                        pointBorderColor: '#ffffff',
                        pointHoverRadius: 6
                    }]
                },
                options: commonOptions
            });
        }

        // 3. Energy Chart
        const energyCanvas = document.getElementById('energy-chart');
        if (energyCanvas && !this.energyChart) {
            this.energyChart = new Chart(energyCanvas, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Energy (kWh)',
                        data: [],
                        backgroundColor: COLORS.units,
                        hoverBackgroundColor: '#059669',
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: commonOptions
            });
        }
    },

    /**
     * Updates charts with the latest array of feeds from ThingSpeak.
     * Parses labels (timestamps) and values.
     * @param {Array} feeds - The array of historical feeds
     */
    update(feeds) {
        if (!feeds || feeds.length === 0) return;

        // Parse feeds to retrieve arrays of values
        const parsedData = this.parseHistoricalFeeds(feeds);

        // Update Power Chart if active
        if (this.powerChart) {
            this.powerChart.data.labels = parsedData.timestamps;
            this.powerChart.data.datasets[0].data = parsedData.power;
            this.powerChart.update();
        }

        // Update Voltage Chart if active
        if (this.voltageChart) {
            this.voltageChart.data.labels = parsedData.timestamps;
            this.voltageChart.data.datasets[0].data = parsedData.voltage;
            this.voltageChart.update();
        }

        // Update Energy Chart if active
        if (this.energyChart) {
            // For energy bar chart, we can display the cumulative energy reading
            // or group by day. Let's group by day if there are multiple days,
            // or show the values per timestamp to show rising consumption if it's
            // a single day.
            const grouped = this.groupEnergyByDate(feeds);
            this.energyChart.data.labels = grouped.labels;
            this.energyChart.data.datasets[0].data = grouped.data;
            this.energyChart.update();
        }
    },

    /**
     * Parses historical feeds into arrays of timestamps and parameter values
     * @param {Array} feeds - The array of feeds
     * @returns {Object} Extracted data arrays
     */
    parseHistoricalFeeds(feeds) {
        const timestamps = [];
        const voltage = [];
        const current = [];
        const power = [];
        const energy = [];

        feeds.forEach(feed => {
            // Format time as hh:mm:ss for compact x-axis labels
            const date = new Date(feed.created_at);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            
            timestamps.push(timeStr);
            voltage.push(feed.field1 ? parseFloat(feed.field1) : 0);
            current.push(feed.field2 ? parseFloat(feed.field2) : 0);
            power.push(feed.field3 ? parseFloat(feed.field3) : 0);
            energy.push(feed.field4 ? parseFloat(feed.field4) : 0);
        });

        return { timestamps, voltage, current, power, energy };
    },

    /**
     * Groups energy readings by date or shows the last few readings
     * if all readings are on the same day.
     * @param {Array} feeds - ThingSpeak feeds list
     * @returns {Object} Labels and data arrays for the bar chart
     */
    groupEnergyByDate(feeds) {
        const dayMap = new Map();

        feeds.forEach(feed => {
            if (!feed.field4) return;
            
            const date = new Date(feed.created_at);
            // Get date string (e.g. "May 22")
            const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            const val = parseFloat(feed.field4);

            // ThingSpeak energy is cumulative. For grouping, we take the max reading of that day.
            if (!dayMap.has(dateStr) || val > dayMap.get(dateStr)) {
                dayMap.set(dateStr, val);
            }
        });

        // If data only spans 1 day (very common for live feeds), grouping by day
        // will result in a single bar. In this case, to keep it visually rich,
        // we display the individual entry-by-entry cumulative energy readings instead.
        if (dayMap.size <= 1) {
            const labels = [];
            const data = [];
            
            // Limit to last 10 entries to avoid overcrowding the bar chart
            const recentFeeds = feeds.slice(-10);
            recentFeeds.forEach(feed => {
                const date = new Date(feed.created_at);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                labels.push(timeStr);
                data.push(feed.field4 ? parseFloat(feed.field4) : 0);
            });

            return { labels, data };
        }

        // If there are multiple days, return the max cumulative energy per day
        const labels = Array.from(dayMap.keys());
        const data = Array.from(dayMap.values());
        return { labels, data };
    }
};

export default Charts;
