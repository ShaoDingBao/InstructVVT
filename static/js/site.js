(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const demoData = {
    "00000013": {
      label: "Upper-body try-on",
      instruction:
        "Replace the woman’s upper-body clothing with the reference garment.",
      garmentAlt: "Reference black short-sleeved T-shirt",
    },
    "00000004": {
      label: "Full-dress try-on",
      instruction:
        "Replace the woman’s dress with the blush-pink off-shoulder reference garment.",
      garmentAlt: "Reference blush-pink off-shoulder dress",
    },
    "00000042": {
      label: "Try-on in a crowded scene",
      instruction:
        "Change the green-dressed woman’s clothing to the reference qipao.",
      garmentAlt: "Reference teal patterned qipao",
    },
    "00000095": {
      label: "Lower-body try-on",
      instruction:
        "Replace the woman’s lower-body clothing with the black reference leggings.",
      garmentAlt: "Reference black high-waisted leggings",
    },
  };

  const source = $("#demo-source");
  const output = $("#demo-output");
  const playButton = $("#demo-play");
  const demoStatus = $("#demo-status");
  const pair = [source, output].filter(Boolean);

  if (pair.length === 2) {
    let activeDemo = "";
    let generation = 0;
    let loadController;
    let playAttempt = 0;
    let pairReady = false;
    let hasError = false;
    let inView = false;
    let wantsPlayback = !motionQuery.matches;
    let userPaused = false;
    let resumeFromBackground = false;
    let backgroundBlocked = false;
    let playPending = false;
    const internalSeeks = new WeakMap();

    const setStatus = (message) => {
      if (demoStatus && demoStatus.textContent !== message)
        demoStatus.textContent = message;
    };
    const updatePlayButton = () => {
      if (!playButton) return;
      const willPlay =
        wantsPlayback && !userPaused && !backgroundBlocked && !hasError;
      const label = playButton.querySelector("[data-play-label]");
      if (label) label.textContent = willPlay ? "Pause demo" : "Play demo";
      const icon = playButton.querySelector(".play-icon");
      if (icon) icon.textContent = willPlay ? "Ⅱ" : "▶";
      playButton.setAttribute(
        "aria-label",
        willPlay ? "Pause both demo videos" : "Play both demo videos",
      );
      playButton.setAttribute("aria-pressed", String(willPlay));
      playButton.dataset.playing = String(willPlay);
    };
    const pausePair = () => {
      playAttempt += 1;
      playPending = false;
      pair.forEach((video) => video.pause());
    };
    const seekTo = (video, time) => {
      if (video.readyState < 1 || !Number.isFinite(time)) return;
      const end = Number.isFinite(video.duration)
        ? Math.max(0, video.duration - 0.015)
        : time;
      const nextTime = Math.max(0, Math.min(time, end));
      if (Math.abs(video.currentTime - nextTime) < 0.035) return;
      internalSeeks.set(video, nextTime);
      try {
        video.currentTime = nextTime;
      } catch {
        internalSeeks.delete(video);
      }
    };
    const mayPlay = () =>
      pairReady &&
      !hasError &&
      inView &&
      !document.hidden &&
      wantsPlayback &&
      !userPaused &&
      !backgroundBlocked;
    const playPair = async () => {
      if (!mayPlay() || playPending || pair.every((video) => !video.paused))
        return;
      const currentGeneration = generation;
      const currentAttempt = ++playAttempt;
      playPending = true;
      seekTo(output, source.currentTime);
      const results = await Promise.allSettled(
        pair.map((video) => video.play()),
      );
      if (currentGeneration !== generation || currentAttempt !== playAttempt)
        return;
      playPending = false;
      if (!mayPlay()) {
        pausePair();
        return;
      }
      if (results.some((result) => result.status === "rejected")) {
        pausePair();
        wantsPlayback = false;
        setStatus("Playback is paused. Select Play demo to start both videos.");
      } else {
        setStatus("");
      }
      updatePlayButton();
    };

    pair.forEach((video) => {
      // One controller owns the pair, including browsers that honor HTML autoplay early.
      video.removeAttribute("autoplay");
      video.autoplay = false;
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.pause();
      video.addEventListener("seeking", () => {
        const expected = internalSeeks.get(video);
        if (
          expected !== undefined &&
          Math.abs(video.currentTime - expected) < 0.08
        )
          return;
        internalSeeks.delete(video);
        seekTo(video === source ? output : source, video.currentTime);
      });
      video.addEventListener("seeked", () => internalSeeks.delete(video));
      video.addEventListener("ratechange", () => {
        const companion = video === source ? output : source;
        if (companion.playbackRate !== video.playbackRate)
          companion.playbackRate = video.playbackRate;
      });
    });
    source.addEventListener("timeupdate", () => {
      if (!pairReady || source.seeking || output.seeking || source.paused)
        return;
      if (Math.abs(source.currentTime - output.currentTime) > 0.16)
        seekTo(output, source.currentTime);
    });

    const selectDemo = (id, force = false) => {
      const demo = demoData[id];
      if (!demo || (!force && activeDemo === id)) return;
      activeDemo = id;
      generation += 1;
      const currentGeneration = generation;
      loadController?.abort();
      loadController = new AbortController();
      pausePair();
      pairReady = false;
      hasError = false;
      const ready = new Set();
      setStatus("Loading demo…");
      $$(".demo-tab[data-demo]").forEach((tab) => {
        const selected = tab.dataset.demo === id;
        tab.classList.toggle("is-active", selected);
        tab.setAttribute("aria-pressed", String(selected));
      });
      const garment = $("#demo-garment");
      if (garment) {
        garment.src = `static/media/${id}/garment.webp`;
        garment.alt = demo.garmentAlt;
      }
      const instruction = $("#demo-instruction");
      if (instruction) instruction.textContent = `“${demo.instruction}”`;
      const stage = source.closest("[data-active-demo]");
      if (stage) stage.dataset.activeDemo = id;
      pair.forEach((video, index) => {
        const file = `static/media/${id}/${index === 0 ? "source" : "output"}.mp4`;
        const absoluteSource = new URL(file, document.baseURI).href;
        const isCurrent = () =>
          currentGeneration === generation &&
          video.currentSrc === absoluteSource;
        const onReady = () => {
          if (!isCurrent() || video.readyState < 3) return;
          ready.add(video);
          if (ready.size === 2 && !hasError) {
            pairReady = true;
            setStatus(
              motionQuery.matches && !wantsPlayback
                ? "Select Play demo to view the comparison."
                : "",
            );
            playPair();
          }
        };
        video.addEventListener("canplay", onReady, {
          signal: loadController.signal,
        });
        video.addEventListener(
          "waiting",
          () => {
            if (!isCurrent() || video.readyState >= 3) return;
            ready.delete(video);
            pairReady = false;
            pausePair();
            if (wantsPlayback && !userPaused)
              setStatus("Buffering both videos…");
          },
          { signal: loadController.signal },
        );
        video.addEventListener(
          "error",
          () => {
            if (!isCurrent() || !video.error) return;
            hasError = true;
            pairReady = false;
            pausePair();
            setStatus(
              "This demo could not load. Select Replay to retry, or choose another example.",
            );
            updatePlayButton();
          },
          { signal: loadController.signal },
        );
        internalSeeks.delete(video);
        video.setAttribute(
          "aria-label",
          `${demo.label}: ${index === 0 ? "original source video" : "InstructVVT result video"}`,
        );
        video.poster = `static/images/posters/${id}-${index === 0 ? "source" : "output"}.webp`;
        video.src = file;
        video.load();
      });
      updatePlayButton();
    };

    $$(".demo-tab[data-demo]").forEach((tab) => {
      tab.addEventListener("click", () => selectDemo(tab.dataset.demo));
    });
    playButton?.addEventListener("click", () => {
      const isRequested =
        wantsPlayback && !userPaused && !backgroundBlocked && !hasError;
      if (isRequested) {
        wantsPlayback = false;
        userPaused = true;
        pausePair();
        setStatus("Demo paused.");
      } else {
        wantsPlayback = true;
        userPaused = false;
        backgroundBlocked = false;
        if (hasError) selectDemo(activeDemo, true);
        else playPair();
      }
      updatePlayButton();
    });
    $("#demo-replay")?.addEventListener("click", () => {
      wantsPlayback = true;
      userPaused = false;
      backgroundBlocked = false;
      pausePair();
      if (hasError) selectDemo(activeDemo, true);
      else {
        pair.forEach((video) => seekTo(video, 0));
        playPair();
      }
      updatePlayButton();
    });

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting;
          if (inView) playPair();
          else pausePair();
        },
        { threshold: 0.15 },
      );
      observer.observe(source);
    } else {
      inView = true;
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        resumeFromBackground =
          pair.every((video) => !video.paused) && wantsPlayback && !userPaused;
        backgroundBlocked = true;
        pausePair();
      } else {
        backgroundBlocked = !resumeFromBackground;
        if (resumeFromBackground) playPair();
        resumeFromBackground = false;
      }
      updatePlayButton();
    });
    motionQuery.addEventListener("change", (event) => {
      if (event.matches) {
        wantsPlayback = false;
        pausePair();
        setStatus(
          "Reduced motion enabled. Select Play demo to view the comparison.",
        );
        updatePlayButton();
      }
    });
    selectDemo("00000013");
  }

  const supplementaryData = {
    tripvvt: {
      label: "TripVVT-Bench",
      description:
        "In-the-wild comparisons. Each video includes the source, reference garment, try-on instruction, and generated results.",
      files: Array.from(
        { length: 9 },
        (_, index) =>
          `static/media/supplementary/tripvvt-s/tripvvt-s-${index + 1}.mp4`,
      ),
    },
    vivid: {
      label: "ViViD-S",
      description:
        "Video try-on comparisons on ViViD-S, showing garment transfer and preservation of the source video over time.",
      files: Array.from(
        { length: 6 },
        (_, index) =>
          `static/media/supplementary/vivid-s/vivid-s-${index + 1}.mp4`,
      ),
    },
    ablation: {
      label: "Ablation",
      description:
        "The full model alongside variants with individual conditioning components removed.",
      files: ["static/media/supplementary/ablation/ablation-1.mp4"],
    },
    failure: {
      label: "Failure case",
      description:
        "A conflict between the text instruction and reference garment illustrates a remaining limitation in garment fidelity.",
      files: ["static/media/supplementary/failure/failure-1.mp4"],
    },
  };
  const supplementaryVideo = $("#supplementary-video");
  const supplementarySamples = $("#supplementary-samples");
  let activeCategory = "tripvvt";
  let activeSample = -1;
  let supplementaryResume = false;

  const setText = (selector, text) => {
    const element = $(selector);
    if (element) element.textContent = text;
  };
  const selectSupplementaryVideo = (index) => {
    const category = supplementaryData[activeCategory];
    if (!supplementaryVideo || !category.files[index] || index === activeSample)
      return;
    activeSample = index;
    supplementaryResume = false;
    supplementaryVideo.pause();
    supplementaryVideo.src = category.files[index];
    supplementaryVideo.poster = `static/images/posters/${activeCategory}-${index + 1}.webp`;
    supplementaryVideo.setAttribute(
      "aria-label",
      `${category.label}, video ${index + 1} of ${category.files.length}`,
    );
    supplementaryVideo.load();
    setText("#supplementary-dataset", category.label);
    setText(
      "#supplementary-title-label",
      category.files.length === 1
        ? category.label
        : `Supplementary result ${index + 1}`,
    );
    setText(
      "#supplementary-count",
      `${String(index + 1).padStart(2, "0")} / ${String(category.files.length).padStart(2, "0")}`,
    );
    setText("#supplementary-description", category.description);
    supplementarySamples
      ?.querySelectorAll("button")
      .forEach((button, buttonIndex) => {
        const selected = buttonIndex === index;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
  };
  const selectCategory = (key, force = false) => {
    if (
      !supplementaryData[key] ||
      !supplementarySamples ||
      (!force && key === activeCategory)
    )
      return;
    activeCategory = key;
    activeSample = -1;
    const category = supplementaryData[key];
    $$(".category-tab[data-category]").forEach((tab) => {
      const selected = tab.dataset.category === key;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute(
        tab.getAttribute("role") === "tab" ? "aria-selected" : "aria-pressed",
        String(selected),
      );
      if (tab.getAttribute("role") === "tab") tab.tabIndex = selected ? 0 : -1;
    });
    const samples = document.createDocumentFragment();
    category.files.forEach((_, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "supplementary-sample";
      button.setAttribute(
        "aria-label",
        `Show ${category.label} video ${index + 1}`,
      );
      button.setAttribute("aria-pressed", "false");
      const image = document.createElement("img");
      image.src = `static/images/posters/${key}-${index + 1}.webp`;
      image.alt = "";
      image.loading = "lazy";
      const label = document.createElement("span");
      label.textContent = String(index + 1).padStart(2, "0");
      button.append(image, label);
      button.addEventListener("click", () => selectSupplementaryVideo(index));
      samples.append(button);
    });
    supplementarySamples.replaceChildren(samples);
    selectSupplementaryVideo(0);
  };
  $$(".category-tab[data-category]").forEach((tab) =>
    tab.addEventListener("click", () => selectCategory(tab.dataset.category)),
  );
  selectCategory("tripvvt", true);
  supplementaryVideo?.addEventListener("error", () => {
    setText(
      "#supplementary-description",
      "This video could not load. Try another sample or reload the page.",
    );
  });
  document.addEventListener("visibilitychange", () => {
    if (!supplementaryVideo) return;
    if (document.hidden) {
      supplementaryResume = !supplementaryVideo.paused;
      supplementaryVideo.pause();
    } else if (supplementaryResume) {
      supplementaryResume = false;
      supplementaryVideo.play().catch(() => {});
    }
  });

  const resultImage = $("#result-image");
  $$(".result-tab[data-result-image]").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (!resultImage) return;
      $$(".result-tab[data-result-image]").forEach((button) => {
        const selected = button === tab;
        button.classList.toggle("is-active", selected);
        button.setAttribute(
          button.getAttribute("role") === "tab"
            ? "aria-selected"
            : "aria-pressed",
          String(selected),
        );
        if (button.getAttribute("role") === "tab")
          button.tabIndex = selected ? 0 : -1;
      });
      resultImage.src = tab.dataset.resultImage;
      resultImage.alt =
        tab.dataset.resultAlt ||
        tab.dataset.resultLabel ||
        "Qualitative comparison";
      setText(
        "#result-dataset-label",
        tab.dataset.resultLabel || tab.textContent.trim(),
      );
      if (tab.id) $("#result-figure")?.setAttribute("aria-labelledby", tab.id);
    });
  });

  // Arrow keys follow the expected interaction when the markup uses ARIA tabs.
  [".category-tab", ".result-tab"].forEach((selector) => {
    const tabs = $$(selector);
    tabs.forEach((tab, index) => {
      if (tab.getAttribute("role") !== "tab") return;
      tab.tabIndex = tab.getAttribute("aria-selected") === "true" ? 0 : -1;
      tab.addEventListener("keydown", (event) => {
        let next;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft")
          next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = tabs.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        tabs[next].focus();
        tabs[next].click();
      });
    });
  });

  const lightbox = $("#lightbox");
  const lightboxImage = $("#lightbox-image");
  let lightboxTrigger;
  let previousOverflow = "";
  $$("[data-zoom]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      if (!lightbox || !lightboxImage) return;
      const image = trigger.matches("img")
        ? trigger
        : trigger.querySelector("img") ||
          trigger.parentElement.querySelector("img");
      const zoomTarget = trigger.dataset.zoom;
      const targetImage = zoomTarget?.startsWith("#") ? $(zoomTarget) : null;
      const expandedImage = targetImage || image;
      const imageSource =
        targetImage?.currentSrc ||
        targetImage?.src ||
        (zoomTarget && !zoomTarget.startsWith("#")
          ? zoomTarget
          : expandedImage?.currentSrc || expandedImage?.src);
      if (!imageSource) return;
      lightboxTrigger = trigger;
      lightboxImage.src = imageSource;
      lightboxImage.alt = expandedImage?.alt || "Expanded paper figure";
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      lightbox.showModal();
      $("#lightbox-close")?.focus();
    });
  });
  $("#lightbox-close")?.addEventListener("click", () => lightbox?.close());
  lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
  lightbox?.addEventListener("close", () => {
    document.body.style.overflow = previousOverflow;
    lightboxTrigger?.focus();
  });

  $("#copy-bibtex")?.addEventListener("click", async () => {
    const bibtex = $("#bibtex");
    if (!bibtex) return;
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard is unavailable");
      await navigator.clipboard.writeText(bibtex.textContent.trim());
      setText("#copy-status", "BibTeX copied to clipboard.");
    } catch {
      const range = document.createRange();
      range.selectNodeContents(bibtex);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      setText(
        "#copy-status",
        "Automatic copying is unavailable. The BibTeX is selected; use your device’s Copy command.",
      );
    }
  });

  const menuToggle = $("#menu-toggle");
  const navigation = $("#site-nav-links");
  const closeMenu = () => {
    menuToggle?.setAttribute("aria-expanded", "false");
    navigation?.classList.remove("is-open");
  };
  menuToggle?.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(open));
    navigation?.classList.toggle("is-open", open);
  });
  navigation
    ?.querySelectorAll("a")
    .forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      menuToggle?.getAttribute("aria-expanded") === "true"
    ) {
      closeMenu();
      menuToggle.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (
      menuToggle?.getAttribute("aria-expanded") === "true" &&
      !navigation?.contains(event.target) &&
      !menuToggle.contains(event.target)
    )
      closeMenu();
  });
})();
