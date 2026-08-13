const demoData = {
  "00000013": {
    instruction: "Replace the woman’s upper-body clothing with the reference garment.",
    garmentAlt: "Reference black short-sleeved T-shirt",
  },
  "00000004": {
    instruction: "Replace the woman’s dress with the blush-pink off-shoulder reference garment.",
    garmentAlt: "Reference blush-pink off-shoulder dress",
  },
  "00000042": {
    instruction: "Change the green-dressed woman’s clothing to the reference qipao.",
    garmentAlt: "Reference teal patterned qipao",
  },
  "00000095": {
    instruction: "Replace the woman’s lower-body clothing with the black reference leggings.",
    garmentAlt: "Reference black high-waisted leggings",
  },
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const demoSource = document.querySelector("#demo-source");
const demoOutput = document.querySelector("#demo-output");
const demoGarment = document.querySelector("#demo-garment");
const demoInstruction = document.querySelector("#demo-instruction");
const flowCard = document.querySelector(".flow-card");

function setVideoSource(video, source) {
  video.pause();
  video.src = source;
  video.load();
  if (!reducedMotion) {
    video.play().catch(() => {});
  }
}

document.querySelectorAll(".demo-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const id = tab.dataset.demo;
    const selected = demoData[id];
    if (!selected || flowCard.dataset.activeDemo === id) return;

    document.querySelectorAll(".demo-tab").forEach((button) => {
      const isActive = button === tab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    flowCard.dataset.activeDemo = id;
    demoGarment.src = `static/media/${id}/garment.webp`;
    demoGarment.alt = selected.garmentAlt;
    demoInstruction.textContent = `“${selected.instruction}”`;
    setVideoSource(demoSource, `static/media/${id}/source.mp4`);
    setVideoSource(demoOutput, `static/media/${id}/output.mp4`);
  });
});

const videos = document.querySelectorAll("video");
if (reducedMotion) {
  videos.forEach((video) => video.pause());
} else if ("IntersectionObserver" in window) {
  const videoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.play().catch(() => {});
        } else {
          entry.target.pause();
        }
      });
    },
    { threshold: 0.18 },
  );
  videos.forEach((video) => videoObserver.observe(video));
}

const resultImage = document.querySelector("#result-image");
const resultFigure = document.querySelector("#result-figure");

document.querySelectorAll(".result-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".result-tab").forEach((button) => {
      const isActive = button === tab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    resultImage.src = tab.dataset.resultImage;
    resultImage.alt = tab.dataset.resultAlt;
    resultFigure.setAttribute("aria-labelledby", tab.id);
  });
});

const lightbox = document.querySelector("#figure-lightbox");
const lightboxImage = lightbox.querySelector("img");
const lightboxClose = lightbox.querySelector(".lightbox-close");

function openLightbox(source, alt) {
  lightboxImage.src = source;
  lightboxImage.alt = alt || "Expanded paper figure";
  lightbox.showModal();
}

document.querySelectorAll("[data-zoom]").forEach((button) => {
  button.addEventListener("click", () => {
    const figureImage = button.parentElement.querySelector("img");
    openLightbox(button.dataset.zoom, figureImage?.alt);
  });
});

document.querySelector("#result-zoom").addEventListener("click", () => {
  openLightbox(resultImage.src, resultImage.alt);
});

lightboxClose.addEventListener("click", () => lightbox.close());
lightbox.addEventListener("click", (event) => {
  const bounds = lightbox.getBoundingClientRect();
  const outside =
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom;
  if (outside) lightbox.close();
});

document.querySelectorAll("[data-copy-target]").forEach((button) => {
  button.addEventListener("click", async () => {
    const target = document.querySelector(`#${button.dataset.copyTarget}`);
    try {
      await navigator.clipboard.writeText(target.innerText);
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = "Copy BibTeX";
      }, 1800);
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = "Selected";
    }
  });
});
