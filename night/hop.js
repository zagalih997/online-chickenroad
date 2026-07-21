(function () {
    "use strict";

    var STASH_KEY = "strutStash";
    var START_STASH = 1000;
    var EDGE = 0.96;
    var STAKE_MAX = 50000;

    var TIERS = {
        easy: { rows: 12, odds: 0.93 },
        medium: { rows: 10, odds: 0.85 },
        hard: { rows: 9, odds: 0.74 },
        hardcore: { rows: 8, odds: 0.62 }
    };

    var streetEl = document.getElementById("strut-street");
    var bankEl = document.getElementById("strut-bank");
    var refillEl = document.getElementById("strut-refill");
    var gearsEl = document.getElementById("strut-gears");
    var multEl = document.getElementById("strut-mult");
    var oddsEl = document.getElementById("strut-odds");
    var takeEl = document.getElementById("strut-take");
    var calloutEl = document.getElementById("strut-callout");
    var stakeInput = document.getElementById("strut-stake");
    var halfBtn = document.getElementById("strut-half");
    var doubleBtn = document.getElementById("strut-double");
    var hopBtn = document.getElementById("strut-hop");
    var collectBtn = document.getElementById("strut-collect");

    if (!streetEl || !bankEl || !refillEl || !gearsEl || !multEl ||
        !oddsEl || !takeEl || !calloutEl || !stakeInput || !hopBtn ||
        !collectBtn || !halfBtn || !doubleBtn) {
        return;
    }

    var state = {
        stash: loadStash(),
        tier: "easy",
        running: false,
        step: 0,
        stake: 0,
        lanes: [],
        hen: null
    };

    /* ------------------------------ stash ------------------------------ */

    function loadStash() {
        var raw = null;
        try {
            raw = window.localStorage.getItem(STASH_KEY);
        } catch (err) {
            raw = null;
        }
        if (raw === null || raw === "") {
            return START_STASH;
        }
        var value = Number(raw);
        if (!isFinite(value) || value < 0) {
            return START_STASH;
        }
        return round2(value);
    }

    function saveStash() {
        try {
            window.localStorage.setItem(STASH_KEY, String(state.stash));
        } catch (err) {
            return;
        }
    }

    function paintStash() {
        bankEl.textContent = money(state.stash);
    }

    /* ----------------------------- helpers ----------------------------- */

    function round2(value) {
        return Math.round(value * 100) / 100;
    }

    function money(value) {
        var rounded = round2(value);
        if (rounded === Math.floor(rounded)) {
            return String(rounded);
        }
        return rounded.toFixed(2);
    }

    function tier() {
        return TIERS[state.tier];
    }

    function multAt(step) {
        if (step < 1) {
            return 1;
        }
        return round2(EDGE / Math.pow(tier().odds, step));
    }

    function say(text, mood) {
        calloutEl.textContent = text;
        calloutEl.classList.remove("strut-good", "strut-bad");
        if (mood) {
            calloutEl.classList.add(mood);
        }
    }

    function paintMeters() {
        var mult = multAt(state.step);
        multEl.textContent = mult.toFixed(2) + "×";
        oddsEl.textContent = Math.round(tier().odds * 100) + "%";
        if (state.running && state.step > 0) {
            takeEl.textContent = money(round2(state.stake * mult));
        } else if (state.running) {
            takeEl.textContent = money(state.stake);
        } else {
            takeEl.textContent = "—";
        }
    }

    /* ------------------------------ street ------------------------------ */

    function buildStreet() {
        streetEl.innerHTML = "";
        state.lanes = [];
        var rows = tier().rows;
        var lane;
        for (var step = rows; step >= 1; step -= 1) {
            lane = document.createElement("div");
            lane.className = "strut-lane";
            lane.setAttribute("data-step", String(step));
            lane.innerHTML =
                '<span class="strut-lane-mult">' +
                multAt(step).toFixed(2) + "×</span>";
            streetEl.appendChild(lane);
            state.lanes[step] = lane;
        }
        var kerb = document.createElement("div");
        kerb.className = "strut-kerb";
        streetEl.appendChild(kerb);

        state.hen = document.createElement("span");
        state.hen.className = "strut-hen";
        state.hen.textContent = "🐔";
        state.hen.setAttribute("aria-hidden", "true");
        kerb.appendChild(state.hen);

        markNextLane();
    }

    function clearNextLane() {
        for (var i = 1; i < state.lanes.length; i += 1) {
            if (state.lanes[i]) {
                state.lanes[i].classList.remove("strut-lane-next");
            }
        }
    }

    function markNextLane() {
        var target = state.lanes[state.step + 1];
        clearNextLane();
        if (target) {
            target.classList.add("strut-lane-next");
        }
    }

    function moveHenTo(lane) {
        lane.appendChild(state.hen);
        state.hen.classList.remove("strut-hen-hopping");
        void state.hen.offsetWidth;
        state.hen.classList.add("strut-hen-hopping");
    }

    function smashLane(lane) {
        lane.classList.add("strut-lane-smash");
        var car = document.createElement("span");
        car.className = "strut-car";
        car.textContent = "🚗";
        car.setAttribute("aria-hidden", "true");
        lane.appendChild(car);
        car.addEventListener("animationend", function () {
            if (car.parentNode) {
                car.parentNode.removeChild(car);
            }
        });
    }

    /* ----------------------------- controls ----------------------------- */

    function setGearsLocked(locked) {
        var buttons = gearsEl.querySelectorAll(".strut-gear");
        for (var i = 0; i < buttons.length; i += 1) {
            buttons[i].disabled = locked;
        }
    }

    function lockForRun(locked) {
        setGearsLocked(locked);
        stakeInput.disabled = locked;
        halfBtn.disabled = locked;
        doubleBtn.disabled = locked;
        refillEl.disabled = locked;
    }

    function readStake() {
        var value = Math.floor(Number(stakeInput.value));
        if (!isFinite(value)) {
            return 0;
        }
        return value;
    }

    function clampStake() {
        var value = readStake();
        if (value < 1) {
            value = 1;
        }
        if (value > STAKE_MAX) {
            value = STAKE_MAX;
        }
        stakeInput.value = String(value);
    }

    function scaleStake(factor) {
        if (state.running) {
            return;
        }
        var value = Math.floor(readStake() * factor);
        if (value < 1) {
            value = 1;
        }
        if (value > STAKE_MAX) {
            value = STAKE_MAX;
        }
        stakeInput.value = String(value);
    }

    function pickTier(button) {
        if (state.running) {
            return;
        }
        var name = button.getAttribute("data-tier");
        if (!TIERS[name] || name === state.tier) {
            return;
        }
        state.tier = name;
        state.step = 0;
        var buttons = gearsEl.querySelectorAll(".strut-gear");
        for (var i = 0; i < buttons.length; i += 1) {
            var live = buttons[i] === button;
            buttons[i].classList.toggle("strut-gear-live", live);
            buttons[i].setAttribute(
                "aria-pressed", live ? "true" : "false"
            );
        }
        buildStreet();
        paintMeters();
        say("Gear set to " + name + " — " + tier().rows +
            " lanes ahead.", "");
    }

    /* ------------------------------- run -------------------------------- */

    function beginRun() {
        clampStake();
        var stake = readStake();
        if (stake <= 0) {
            say("The stake has to be at least 1.", "strut-bad");
            return false;
        }
        if (stake > state.stash) {
            say("Not enough in the stash for that stake.", "strut-bad");
            return false;
        }
        state.stake = stake;
        state.step = 0;
        state.stash = round2(state.stash - stake);
        saveStash();
        paintStash();
        buildStreet();
        state.running = true;
        lockForRun(true);
        collectBtn.disabled = true;
        return true;
    }

    function hop() {
        if (!state.running && !beginRun()) {
            return;
        }
        var nextStep = state.step + 1;
        var lane = state.lanes[nextStep];
        if (!lane) {
            return;
        }
        if (Math.random() < tier().odds) {
            state.step = nextStep;
            moveHenTo(lane);
            lane.classList.add("strut-lane-done");
            collectBtn.disabled = false;
            paintMeters();
            if (state.step >= tier().rows) {
                state.hen.classList.add("strut-hen-safe");
                collect(true);
                return;
            }
            markNextLane();
            say("Lane " + state.step + " cleared at " +
                multAt(state.step).toFixed(2) +
                "×. Hop again or collect.", "");
        } else {
            moveHenTo(lane);
            state.hen.textContent = "💥";
            smashLane(lane);
            clearNextLane();
            say("Headlights! The run ate your " +
                money(state.stake) + " stake.", "strut-bad");
            endRun();
        }
    }

    function collect(clearedRoad) {
        if (!state.running || state.step < 1) {
            return;
        }
        var payout = round2(state.stake * multAt(state.step));
        state.stash = round2(state.stash + payout);
        saveStash();
        paintStash();
        if (clearedRoad) {
            say("Across the whole road! " + money(payout) +
                " banked at " + multAt(state.step).toFixed(2) +
                "×.", "strut-good");
        } else {
            say("Collected " + money(payout) + " at " +
                multAt(state.step).toFixed(2) + "×.",
                "strut-good");
        }
        endRun();
    }

    function endRun() {
        state.running = false;
        state.step = 0;
        lockForRun(false);
        collectBtn.disabled = true;
        paintMeters();
        if (state.stash < 1) {
            say("Stash is empty — hit Refill to keep practising.",
                "strut-bad");
        }
    }

    function refill() {
        if (state.running) {
            return;
        }
        state.stash = START_STASH;
        saveStash();
        paintStash();
        paintMeters();
        say("Stash topped back up to " + START_STASH + ".", "");
    }

    /* ------------------------------ wiring ------------------------------ */

    hopBtn.addEventListener("click", hop);
    collectBtn.addEventListener("click", function () {
        collect(false);
    });
    refillEl.addEventListener("click", refill);
    halfBtn.addEventListener("click", function () {
        scaleStake(0.5);
    });
    doubleBtn.addEventListener("click", function () {
        scaleStake(2);
    });
    stakeInput.addEventListener("change", clampStake);
    gearsEl.addEventListener("click", function (event) {
        var button = event.target.closest(".strut-gear");
        if (button) {
            pickTier(button);
        }
    });

    buildStreet();
    paintStash();
    paintMeters();
    if (state.stash < 1) {
        say("Stash is empty — hit Refill to keep practising.", "");
    }
})();
