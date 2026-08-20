const currencySelect = document.getElementById("currencySelect");
const convertButton = document.getElementById("convertPrices");
const currencyStatus = document.getElementById("currencyStatus");

let currentCurrency = "PHP";
let currentRate = 1;

function formatCurrency(value, currency) {
    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            maximumFractionDigits: currency === "JPY" ? 0 : 2
        }).format(value);
    } catch {
        return `${value.toFixed(2)} ${currency}`;
    }
}

function restorePhp() {
    document.querySelectorAll(".php-price").forEach((el) => {
        const php = Number(el.dataset.php);
        const original = el.dataset.originalText;
        if (original) {
            el.textContent = original;
        } else {
            el.textContent = `₱${php.toLocaleString()}`;
        }
    });

    currencyStatus.textContent = "Prices shown in Philippine pesos.";
}

async function convertAllPrices() {
    const target = currencySelect.value;

    if (!target || target === "PHP") {
        currentCurrency = "PHP";
        currentRate = 1;
        restorePhp();

        if (typeof clarity === "function") {
            clarity("event", "guide_currency_php");
        }
        return;
    }

    currencyStatus.textContent = "Updating exchange rate…";
    convertButton.disabled = true;

    try {
        const response = await fetch(
            `https://api.frankfurter.dev/v2/rate/PHP/${encodeURIComponent(target)}`
        );

        if (!response.ok) {
            throw new Error("Exchange-rate request failed");
        }

        const data = await response.json();

        if (!data.rate) {
            throw new Error("No exchange rate returned");
        }

        currentCurrency = target;
        currentRate = Number(data.rate);

        document.querySelectorAll(".php-price").forEach((el) => {
            const php = Number(el.dataset.php);

            if (!el.dataset.originalText) {
                el.dataset.originalText = el.textContent.trim();
            }

            const converted = php * currentRate;

            el.textContent =
                `${el.dataset.originalText} · approx. ${formatCurrency(converted, target)}`;
        });

        currencyStatus.textContent =
            `Approximate reference conversion: 1 PHP = ${currentRate.toFixed(4)} ${target}. Actual card or cash exchange rates may differ.`;

        if (typeof clarity === "function") {
            clarity("event", `guide_currency_${target.toLowerCase()}`);
        }

    } catch (error) {
        console.error(error);
        currencyStatus.textContent =
            "Currency conversion is temporarily unavailable. Philippine peso prices are still shown.";
    } finally {
        convertButton.disabled = false;
    }
}

document.querySelectorAll(".php-price").forEach((el) => {
    el.dataset.originalText = el.textContent.trim();
});

convertButton?.addEventListener("click", convertAllPrices);

document.querySelectorAll(".service-link").forEach((link) => {
    link.addEventListener("click", () => {
        if (typeof clarity === "function") {
            clarity("event", "guide_service_click");
        }
    });
});

document.querySelector(".atv-cta")?.addEventListener("click", () => {
    if (typeof clarity === "function") {
        clarity("event", "guide_atv_request");
    }
});
