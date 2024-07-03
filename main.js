document.addEventListener('DOMContentLoaded', () => {
    updatePrices();
    setInterval(updatePrices, 20000); // Update every 20 seconds
    setThemeFromLocalStorage();
    addEventListeners();
    showLoader(false);
    hideError();
    displayWelcomeMessage();
    checkForUpdates();
    initTooltips();
    initPriceComparison();
    enableOfflineMode();
    displayLastUpdated();
});

const urls = {
    bitcoin: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    ethereum: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
    dogecoin: 'https://api.coingecko.com/api/v3/simple/price?ids=dogecoin&vs_currencies=usd'
};

const formatPrice = (price) => {
    return price.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const fetchPriceAndUpdateChart = async (crypto, chartId, priceId, adviceId) => {
    try {
        showLoader(true);
        const response = await fetch(urls[crypto]);
        const data = await response.json();
        validateApiResponse(data, crypto);
        const price = data[crypto].usd;
        document.getElementById(priceId).textContent = `Current Price: ${formatPrice(price)}`;
        storePrice(crypto, price);
        provideAdvice(crypto, price, adviceId);
        updateChart(chartId, price);
        addPriceToTable(crypto, price);
        displayAveragePrice(crypto);
        displayPriceVolatility(crypto);
        displayLastUpdated();
    } catch (error) {
        showError(`Error fetching ${crypto} price: ${error.message}`);
        console.error(`Error fetching ${crypto} price:`, error);
    } finally {
        showLoader(false);
    }
};

const updateChart = (chartId, price) => {
    const chart = Chart.getChart(chartId); // Get the chart if it has been created
    if (chart) {
        chart.data.labels.push(new Date().toLocaleTimeString());
        chart.data.datasets.forEach((dataset) => {
            dataset.data.push(price);
        });
        chart.update();
    } else {
        const ctx = document.getElementById(chartId).getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: [new Date().toLocaleTimeString()],
                datasets: [{
                    label: `${chartId.charAt(0).toUpperCase() + chartId.slice(1)} Price (USD)`,
                    data: [price],
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return formatPrice(value); // Format y-axis ticks
                            }
                        }
                    }
                }
            }
        });
    }
};

const provideAdvice = (crypto, currentPrice, adviceId) => {
    const historicalPrices = getHistoricalPrices(crypto); // Retrieve historical prices for the crypto
    historicalPrices.push(currentPrice);

    const shortTerm = calculateMovingAverage(historicalPrices, 5); // 5-point moving average
    const longTerm = calculateMovingAverage(historicalPrices, 20); // 20-point moving average

    let advice;
    if (shortTerm > longTerm && historicalPrices[historicalPrices.length - 2] <= longTerm) {
        advice = 'Buy - Short-term trend is rising above long-term trend.';
    } else if (shortTerm < longTerm && historicalPrices[historicalPrices.length - 2] >= longTerm) {
        advice = 'Sell - Short-term trend is falling below long-term trend.';
    } else {
        advice = 'Hold - The market is stable now.';
    }

    document.getElementById(adviceId).textContent = `Advice: ${advice}`;
    displayNotification(`New advice for ${crypto}: ${advice}`);
};

const calculateMovingAverage = (data, numPoints) => {
    const points = data.slice(-numPoints);
    return points.reduce((a, b) => a + b, 0) / points.length;
};

const getHistoricalPrices = (crypto) => {
    const storedPrices = localStorage.getItem(`${crypto}-prices`);
    return storedPrices ? JSON.parse(storedPrices) : [];
};

const storePrice = (crypto, price) => {
    const prices = getHistoricalPrices(crypto);
    prices.push(price);
    if (prices.length > 20) prices.shift(); // Keep only the latest 20 prices
    localStorage.setItem(`${crypto}-prices`, JSON.stringify(prices));
};

const updatePrices = async () => {
    await fetchPriceAndUpdateChart('bitcoin', 'btcChart', 'btcPrice', 'btcAdvice');
    await fetchPriceAndUpdateChart('ethereum', 'ethChart', 'ethPrice', 'ethAdvice');
    await fetchPriceAndUpdateChart('dogecoin', 'dogeChart', 'dogePrice', 'dogeAdvice');
};

// Additional Enhancements
const addEventListeners = () => {
    const themeToggle = document.getElementById('theme-toggle');
    const refreshButton = document.getElementById('refresh-button');
    const compareButton = document.getElementById('compare-button');

    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (refreshButton) refreshButton.addEventListener('click', updatePrices);
    if (compareButton) compareButton.addEventListener('click', comparePrices);
};

const setThemeFromLocalStorage = () => {
    const theme = localStorage.getItem('theme') || 'light';
    document.body.className = theme;
};

const toggleTheme = () => {
    const currentTheme = document.body.className;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.className = newTheme;
    localStorage.setItem('theme', newTheme);
    displayNotification(`Theme changed to ${newTheme}`);
};

const showLoader = (show) => {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = show ? 'block' : 'none';
};

const showError = (message) => {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
};

const hideError = () => {
    const errorDiv = document.getElementById('error');
    if (errorDiv) errorDiv.style.display = 'none';
};

const displayNotification = (message) => {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 5000);
};

const displayWelcomeMessage = () => {
    const message = 'Welcome to the Cryptocurrency Price Tracker!';
    displayNotification(message);
};

const addPriceToTable = (crypto, price) => {
    const table = document.getElementById('price-table');
    if (table) {
        const newRow = table.insertRow();
        const timeCell = newRow.insertCell(0);
        const cryptoCell = newRow.insertCell(1);
        const priceCell = newRow.insertCell(2);
        timeCell.textContent = new Date().toLocaleTimeString();
        cryptoCell.textContent = crypto.charAt(0).toUpperCase() + crypto.slice(1);
        priceCell.textContent = formatPrice(price);
    }
};

const updateAllCharts = (crypto, prices) => {
    const chartIds = ['btcChart', 'ethChart', 'dogeChart'];
    chartIds.forEach((chartId) => {
        if (chartId.includes(crypto)) {
            updateChart(chartId, prices);
        }
    });
};

const fetchHistoricalData = async (crypto) => {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${crypto}/market_chart?vs_currency=usd&days=1`);
        const data = await response.json();
        return data.prices.map(priceData => priceData[1]);
    } catch (error) {
        console.error(`Error fetching historical data for ${crypto}:`, error);
        return [];
    }
};

const initializeCharts = async () => {
    const btcPrices = await fetchHistoricalData('bitcoin');
    const ethPrices = await fetchHistoricalData('ethereum');
    const dogePrices = await fetchHistoricalData('dogecoin');
    updateAllCharts('bitcoin', btcPrices);
    updateAllCharts('ethereum', ethPrices);
    updateAllCharts('dogecoin', dogePrices);
};

const validateApiResponse = (data, crypto) => {
    if (!data || !data[crypto] || !data[crypto].usd) {
        throw new Error(`Invalid response for ${crypto}`);
    }
};

const comparePrices = () => {
    const btcPrice = parseFloat(document.getElementById('btcPrice').textContent.replace(/[^0-9.-]+/g, ""));
    const ethPrice = parseFloat(document.getElementById('ethPrice').textContent.replace(/[^0-9.-]+/g, ""));
    const dogePrice = parseFloat(document.getElementById('dogePrice').textContent.replace(/[^0-9.-]+/g, ""));

    const highest = Math.max(btcPrice, ethPrice, dogePrice);
    let highestCrypto;
    if (highest === btcPrice) {
        highestCrypto = 'Bitcoin';
    } else if (highest === ethPrice) {
        highestCrypto = 'Ethereum';
    } else {
        highestCrypto = 'Dogecoin';
    }

    displayNotification(`Highest price: ${highestCrypto} at ${formatPrice(highest)}`);
};

const checkForUpdates = () => {
    if (navigator.onLine) {
        fetch('/version.txt')
            .then(response => {
                if (!response.ok) throw new Error('Version file not found');
                return response.text();
            })
            .then(version => {
                const currentVersion = localStorage.getItem('version') || '0.0.0';
                if (version !== currentVersion) {
                    localStorage.setItem('version', version);
                    displayNotification('New update available! Please refresh the page.');
                }
            })
            .catch(error => console.error('Error checking for updates:', error));
    }
};

const initTooltips = () => {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = el.getAttribute('data-tooltip');
            document.body.appendChild(tooltip);
            tooltip.style.left = `${el.getBoundingClientRect().left}px`;
            tooltip.style.top = `${el.getBoundingClientRect().top - tooltip.offsetHeight}px`;
        });
        el.addEventListener('mouseleave', () => {
            const tooltip = document.querySelector('.tooltip');
            if (tooltip) tooltip.remove();
        });
    });
};

const initPriceComparison = () => {
    const comparisonButton = document.createElement('button');
    comparisonButton.id = 'compare-button';
    comparisonButton.textContent = 'Compare Prices';
    document.body.appendChild(comparisonButton);
    comparisonButton.addEventListener('click', comparePrices);
};

const enableOfflineMode = () => {
    window.addEventListener('offline', () => {
        showError('You are offline. Some features may not be available.');
    });

    window.addEventListener('online', () => {
        hideError();
        updatePrices();
        displayNotification('You are back online.');
    });
};

const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const formatTime = (time) => {
    return new Date(time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

const displayLastUpdated = () => {
    const lastUpdated = new Date();
    const dateString = `${formatDate(lastUpdated)} at ${formatTime(lastUpdated)}`;
    const lastUpdatedElem = document.getElementById('last-updated');
    if (lastUpdatedElem) lastUpdatedElem.textContent = `Last Updated: ${dateString}`;
};

const calculatePercentageChange = (oldPrice, newPrice) => {
    return ((newPrice - oldPrice) / oldPrice * 100).toFixed(2);
};

const displayPriceChange = (crypto, oldPrice, newPrice) => {
    const change = calculatePercentageChange(oldPrice, newPrice);
    const changeElement = document.getElementById(`${crypto}-change`);
    if (changeElement) {
        changeElement.textContent = `${change}%`;
        changeElement.style.color = change > 0 ? 'green' : 'red';
    }
};

const calculateAveragePrice = (prices) => {
    return prices.reduce((a, b) => a + b, 0) / prices.length;
};

const displayAveragePrice = (crypto) => {
    const prices = getHistoricalPrices(crypto);
    const avgPrice = calculateAveragePrice(prices);
    const avgPriceElem = document.getElementById(`${crypto}-avg-price`);
    if (avgPriceElem) avgPriceElem.textContent = `Avg: ${formatPrice(avgPrice)}`;
};

const calculatePriceVolatility = (prices) => {
    const avgPrice = calculateAveragePrice(prices);
    const squaredDiffs = prices.map(price => Math.pow(price - avgPrice, 2));
    const avgSquaredDiff = calculateAveragePrice(squaredDiffs);
    return Math.sqrt(avgSquaredDiff).toFixed(2);
};

const displayPriceVolatility = (crypto) => {
    const prices = getHistoricalPrices(crypto);
    const volatility = calculatePriceVolatility(prices);
    const volatilityElem = document.getElementById(`${crypto}-volatility`);
    if (volatilityElem) volatilityElem.textContent = `Volatility: ${volatility}`;
};

// Call the initialize function when the page loads
document.addEventListener('DOMContentLoaded', () => {
    setThemeFromLocalStorage();
    initializeCharts();
    addEventListeners();
    updatePrices();
    setInterval(updatePrices, 20000); // Update every 20 seconds
    displayLastUpdated();
    checkForUpdates();
    initTooltips();
    initPriceComparison();
    enableOfflineMode();
    showLoader(false);
    hideError();
    displayWelcomeMessage();
});
