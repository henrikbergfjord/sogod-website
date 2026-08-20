const SERVICE_CATALOG = {
    airport_pickup: { name: "Airport pickup", price: 5000 },
    airport_dropoff: { name: "Airport drop-off", price: 5000 },
    scooter: { name: "Scooter rental", price: 500, quantity: true, unit: "day" },
    shopping_quick: { name: "Shopping / local errand help", price: 400 },
    shopping_halfday: { name: "Half-day practical help", price: 700 },

    guide_day: { name: "Personal local guide", price: 1000, quantity: true, unit: "day" },
    guide_week: { name: "Local guide · 7 days", price: 6000 },
    local_driver_day: { name: "Private local driver / car", price: 3000 },
    tricycle_halfday: { name: "Local tricycle · half day", price: 800 },

    banca_halfday: { name: "Traditional banca boat · half day", price: 2500 },
    banca_fullday: { name: "Private banca boat · longer outing", price: 4000 },

    atv_grassland: { name: "Mayon ATV · Grassland Trail", price: 500 },
    atv_cagsawa: { name: "Mayon ATV · Cagsawa Forest Trail", price: 950 },
    atv_greenlava: { name: "Mayon ATV · Green Lava Trail", price: 1850 },
    atv_blacklava: { name: "Mayon ATV · Black Lava Trail", price: 2250 },

    boodle: { name: "Boodle Fight experience", price: 750, quantity: true, unit: "guest" },
    food_day: { name: "Bicol food & market day", price: 1000 },
    beach_day_help: { name: "Beach & island planning help", price: 500 }
};

const form = document.getElementById("bookingForm");
const serviceChecks = [...document.querySelectorAll(".service-check")];
const qtyInputs = [...document.querySelectorAll(".service-qty")];
const estimateItems = document.getElementById("estimateItems");
const totalPhp = document.getElementById("totalPhp");
const totalConverted = document.getElementById("totalConverted");
const currencySelect = document.getElementById("currencySelect");
const rateStatus = document.getElementById("rateStatus");
const guestsInput = document.getElementById("guests");
const guestSummary = document.getElementById("guestSummary");
const arrivalInput = document.getElementById("arrivalDate");
const departureInput = document.getElementById("departureDate");
const stayNights = document.getElementById("stayNights");

let conversionRate = 1;
let conversionCurrency = "PHP";

function php(value) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        maximumFractionDigits: 0
    }).format(value);
}

function converted(value) {
    if (conversionCurrency === "PHP") return "";

    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: conversionCurrency,
            maximumFractionDigits: conversionCurrency === "JPY" ? 0 : 2
        }).format(value * conversionRate);
    } catch {
        return `${(value * conversionRate).toFixed(2)} ${conversionCurrency}`;
    }
}

function getQty(serviceKey) {
    const input = document.querySelector(`[data-qty-for="${serviceKey}"]`);
    if (!input) return 1;
    return Math.max(1, Number(input.value) || 1);
}

function selectedServices() {
    return serviceChecks
        .filter((check) => check.checked)
        .map((check) => {
            const key = check.dataset.service;
            const service = SERVICE_CATALOG[key];
            const qty = service.quantity ? getQty(key) : 1;
            return {
                key,
                ...service,
                qty,
                lineTotal: service.price * qty
            };
        });
}

function calculateTotal() {
    return selectedServices().reduce((sum, item) => sum + item.lineTotal, 0);
}

function renderEstimate() {
    const selected = selectedServices();
    const total = calculateTotal();

    if (!selected.length) {
        estimateItems.innerHTML = `
            <div class="empty-estimate">
                Choose services and experiences to build your estimate.
            </div>
        `;
    } else {
        estimateItems.innerHTML = selected.map((item) => {
            const qtyLabel = item.quantity
                ? ` × ${item.qty} ${item.qty === 1 ? item.unit : item.unit + "s"}`
                : "";

            return `
                <div class="estimate-line">
                    <span>${item.name}${qtyLabel}</span>
                    <strong>${php(item.lineTotal)}</strong>
                </div>
            `;
        }).join("");
    }

    totalPhp.textContent = php(total);

    if (conversionCurrency !== "PHP" && conversionRate) {
        totalConverted.textContent = `≈ ${converted(total)}`;
    } else {
        totalConverted.textContent = "";
    }

    guestSummary.textContent = guestsInput?.value || "—";

    syncBoodleGuests();
}

function syncBoodleGuests() {
    const boodleQty = document.querySelector('[data-qty-for="boodle"]');
    if (!boodleQty || document.activeElement === boodleQty) return;

    const guests = Math.max(2, Number(guestsInput?.value) || 2);
    boodleQty.value = guests;
}

function updateNights() {
    if (!arrivalInput?.value || !departureInput?.value) {
        stayNights.textContent = "—";
        return;
    }

    const start = new Date(`${arrivalInput.value}T00:00:00`);
    const end = new Date(`${departureInput.value}T00:00:00`);
    const nights = Math.round((end - start) / 86400000);

    stayNights.textContent = nights > 0 ? `${nights} night${nights === 1 ? "" : "s"}` : "Check dates";
}

async function updateCurrency() {
    const target = currencySelect.value;
    conversionCurrency = target;

    if (target === "PHP") {
        conversionRate = 1;
        rateStatus.textContent = "Prices shown in Philippine pesos.";
        renderEstimate();
        return;
    }

    rateStatus.textContent = "Updating live reference exchange rate…";

    try {
        const response = await fetch(
            `https://api.frankfurter.dev/v2/rate/PHP/${encodeURIComponent(target)}`
        );

        if (!response.ok) throw new Error("Rate request failed");

        const data = await response.json();
        conversionRate = Number(data.rate);

        rateStatus.textContent =
            `Reference conversion: 1 PHP = ${conversionRate.toFixed(4)} ${target}. Your bank/card rate may differ.`;

        renderEstimate();

        if (typeof clarity === "function") {
            clarity("event", `booking_currency_${target.toLowerCase()}`);
        }
    } catch (error) {
        console.error(error);
        rateStatus.textContent =
            "Currency conversion is temporarily unavailable. PHP estimate is still available.";
        conversionRate = 0;
        renderEstimate();
    }
}

function preselectFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const service = (params.get("service") || "").toLowerCase();
    const interest = (params.get("interest") || "").toLowerCase();

    const serviceMap = {
        "local-guide": "guide_day",
        "airport-transfer": "airport_pickup",
        "shopping-help": "shopping_quick",
        "boat-trip": "banca_halfday",
        "mayon-atv": "atv_greenlava",
        "food-culture": "food_day"
    };

    if (serviceMap[service]) {
        const check = document.querySelector(`[data-service="${serviceMap[service]}"]`);
        if (check) check.checked = true;
    }

    if (interest === "boodle-fight") {
        const check = document.querySelector('[data-service="boodle"]');
        if (check) check.checked = true;
    }

    if (interest === "beaches") {
        const check = document.querySelector('[data-service="beach_day_help"]');
        if (check) check.checked = true;
    }

    if (interest === "food-culture") {
        const check = document.querySelector('[data-service="food_day"]');
        if (check) check.checked = true;
    }
}

serviceChecks.forEach((check) => {
    check.addEventListener("change", () => {
        renderEstimate();

        if (check.checked && typeof clarity === "function") {
            clarity("event", `booking_add_${check.dataset.service}`);
        }
    });
});

qtyInputs.forEach((input) => input.addEventListener("input", renderEstimate));
currencySelect?.addEventListener("change", updateCurrency);
guestsInput?.addEventListener("input", () => {
    syncBoodleGuests();
    renderEstimate();
});

arrivalInput?.addEventListener("change", updateNights);
departureInput?.addEventListener("change", updateNights);

form?.addEventListener("submit", () => {
    if (typeof clarity === "function") {
        clarity("event", "booking_prepare_email");
    }
});

preselectFromUrl();
syncBoodleGuests();
updateNights();
renderEstimate();
