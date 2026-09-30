# InstructVVT

**Instruction-Driven Video Virtual Try-On without Auxiliary Spatial Priors**

[Project Page](https://shaodingbao.github.io/InstructVVT/) · [Paper (PDF)](https://shaodingbao.github.io/InstructVVT/static/pdfs/InstructVVT.pdf) · [Supplementary Videos](https://shaodingbao.github.io/InstructVVT/#supplementary) · [arXiv](https://arxiv.org/abs/2608.14070) · Code coming soon

InstructVVT is an instruction-driven and reference-guided video virtual try-on framework. Given a source video, a reference garment, and a natural-language instruction, it edits the instructed target while preserving identity, motion, scene structure, and temporal consistency. No masks, poses, parsing maps, DensePose conditions, or garment contours are required at inference time.

This repository currently hosts the project page. The paper PDF and supplementary qualitative videos are available on the page; the arXiv preprint is linked, and the code release is pending.

## Authors

Dingbao Shao\*, Song Wu\*, Xinyu Chen, Qian Wang, Jiahang Li, Kuai Jiang, Jiang Lin, Yuhang Liu, Ziyu Chen, Duo Li, Jiaxin Hu, Shengrong Gu, Ziheng Tang, Rongrong Liu, Yanlun Peng, Liang Li, Junlan Feng, Lujia Jin, Ting Zhang, Jian Yang, Zili Yi†

\* Equal contribution. † Corresponding author.

## Project page

The site is dependency-free and served directly from `index.html`. For local preview:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Page features

- Synchronized source/result examples with a shared play and replay control.
- Responsive supplementary gallery, including ablations and a failure case.
- Full-size research figures and copyable BibTeX.
- Self-hosted Manrope variable font; license in `static/fonts/OFL-Manrope.txt`.
- Reduced-motion support and automatic pausing for the main demo outside the viewport.

The page uses plain HTML, CSS, and JavaScript; no build step or external CDN is required.
