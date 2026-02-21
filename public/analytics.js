// analytics.js
export function initializeAnalytics(measurementId) {
    if (!measurementId) {
        console.warn('Google Analytics Measurement ID not provided.');
        return;
    }

    // Inject Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    function gtag() {
        window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', measurementId);

    console.log(`Google Analytics initialized with ID: ${measurementId}`);
}
