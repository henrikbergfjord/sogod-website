document.querySelectorAll(".track-boodle").forEach((element) => {
    element.addEventListener("click", () => {
        if (typeof clarity === "function") {
            clarity("event", "boodle_fight_request");
        }
    });
});
