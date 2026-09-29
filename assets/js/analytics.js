(() => {
    if (window.clarity) return;

    window.clarity = function (...args) {
        window.clarity.q = window.clarity.q || [];
        window.clarity.q.push(args);
    };

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.clarity.ms/tag/y4c5fg1ysl';
    document.head.append(script);
})();
