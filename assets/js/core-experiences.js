
document.querySelectorAll(".track-mini").forEach((el) => {
    el.addEventListener("click", () => {
        const eventName = el.dataset.clarityEvent;
        if (eventName && typeof clarity === "function") {
            clarity("event", eventName);
        }
    });
});
