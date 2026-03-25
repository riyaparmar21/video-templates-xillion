#!/usr/bin/env node
/**
 * Quick CLI to update text in template spec JSON files.
 *
 * Usage:
 *   node scripts/set-text.mjs search-bar "Your search query"
 *   node scripts/set-text.mjs notification "Sender Name" "Message body here"
 *   node scripts/set-text.mjs notification --title "Sender" --body "Message" --timestamp "2m ago"
 *   node scripts/set-text.mjs inflate "YOUR TEXT"
 *   node scripts/set-text.mjs progress-bar 80
 *   node scripts/set-text.mjs progress-bar --percentage 80 --fillStart "#00C853" --fillEnd "#69F0AE"
 *
 * npm script shortcuts:
 *   npm run text:search-bar -- "Your search query"
 *   npm run text:notification -- "Sender Name" "Message body"
 *   npm run text:inflate -- "YOUR TEXT"
 *   npm run text:progress-bar -- 80
 *   npm run text:blur-scroller -- "Motion,Emotion,Direction,Jitter"
 *   npm run text:tweet -- "Display Name" "Tweet body text"
 *   npm run text:tweet -- --name "John" --handle "@john" --text "Hello world" --timestamp "1:00 PM · Mar 15, 2026"
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ── Spec file paths ──
const SPECS = {
  "search-bar": resolve(root, "src/animated-search-bar-spec.json"),
  "notification": resolve(root, "src/ios-notification-spec.json"),
  "inflate": resolve(root, "src/inflating-text-spec.json"),
  "progress-bar": resolve(root, "src/progress-bar-spec.json"),
  "blur-scroller": resolve(root, "src/blur-text-scroller-spec.json"),
  "vault-cards": resolve(root, "src/vault-animated-cards-spec.json"),
  "tweet": resolve(root, "src/tweet-spec.json"),
  "product-reveal": resolve(root, "src/product-reveal-track-spec.json"),
  "social-handle": resolve(root, "src/white-social-handle-spec.json"),
  "showreel-grid": resolve(root, "src/showreel-grid-spec.json"),
  "showreel-frames": resolve(root, "src/mobile-showreel-frames-spec.json"),
  "stack-hiring": resolve(root, "src/stack-hiring-spec.json"),
  "slideshow": resolve(root, "src/slideshow-social-spec.json"),
  "design-preview": resolve(root, "src/design-preview-spec.json"),
  "gen-ai-features": resolve(root, "src/gen-ai-features-spec.json"),
  "vault-card-features": resolve(root, "src/vault-card-features-spec.json"),
  "showcase": resolve(root, "src/showcase-spec.json"),
  "route-text": resolve(root, "src/route-text-spec.json"),
  "web-screens": resolve(root, "src/animated-web-screens-spec.json"),
};

// ── Helpers ──

function loadSpec(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function saveSpec(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--") && i + 1 < args.length) {
      flags[args[i].slice(2)] = args[i + 1];
      i++; // skip value
    } else {
      positional.push(args[i]);
    }
  }
  return { flags, positional };
}

// ── Command handlers ──

function handleSearchBar(args) {
  const { flags, positional } = parseFlags(args);
  const text = flags.text || positional[0];

  if (!text) {
    console.error("Usage: set-text search-bar <text>");
    console.error('  e.g. set-text search-bar "How to edit videos"');
    process.exit(1);
  }

  const specPath = SPECS["search-bar"];
  const spec = loadSpec(specPath);
  const oldText = spec.searchText;
  spec.searchText = text;
  saveSpec(specPath, spec);

  console.log(`✓ Search bar text updated`);
  console.log(`  "${oldText}" → "${text}"`);
  console.log(`  File: src/animated-search-bar-spec.json`);
}

function handleNotification(args) {
  const { flags, positional } = parseFlags(args);

  // Support both positional and flag-based args
  const title = flags.title || positional[0];
  const body = flags.body || positional[1];
  const timestamp = flags.timestamp;

  if (!title && !body && !timestamp) {
    console.error("Usage: set-text notification <title> <body>");
    console.error('  e.g. set-text notification "John" "Hey, are you free?"');
    console.error("");
    console.error("Or use flags:");
    console.error('  set-text notification --title "John" --body "Hey!" --timestamp "2m ago"');
    process.exit(1);
  }

  const specPath = SPECS["notification"];
  const spec = loadSpec(specPath);

  const changes = [];
  if (title) {
    const old = spec.title;
    spec.title = title;
    changes.push(`  title: "${old}" → "${title}"`);
  }
  if (body) {
    const old = spec.body;
    spec.body = body;
    changes.push(`  body:  "${old}" → "${body}"`);
  }
  if (timestamp) {
    const old = spec.timestamp;
    spec.timestamp = timestamp;
    changes.push(`  timestamp: "${old}" → "${timestamp}"`);
  }

  saveSpec(specPath, spec);

  console.log(`✓ Notification text updated`);
  changes.forEach((c) => console.log(c));
  console.log(`  File: src/ios-notification-spec.json`);
}

function handleInflate(args) {
  const { flags, positional } = parseFlags(args);
  const text = flags.text || positional[0];

  if (!text) {
    console.error("Usage: set-text inflate <text>");
    console.error('  e.g. set-text inflate "BOOM"');
    process.exit(1);
  }

  const specPath = SPECS["inflate"];
  const spec = loadSpec(specPath);
  const oldText = spec.text;
  spec.text = text;
  saveSpec(specPath, spec);

  console.log(`✓ Inflating text updated`);
  console.log(`  "${oldText}" → "${text}"`);
  console.log(`  File: src/inflating-text-spec.json`);
}

function handleProgressBar(args) {
  const { flags, positional } = parseFlags(args);
  const percentage = flags.percentage || positional[0];

  if (!percentage && !flags.fillStart && !flags.fillEnd) {
    console.error("Usage: set-text progress-bar <percentage>");
    console.error('  e.g. set-text progress-bar 80');
    console.error("");
    console.error("Or use flags:");
    console.error('  set-text progress-bar --percentage 80 --fillStart "#00C853" --fillEnd "#69F0AE"');
    process.exit(1);
  }

  const specPath = SPECS["progress-bar"];
  const spec = loadSpec(specPath);

  const changes = [];
  if (percentage) {
    const old = spec.percentage;
    spec.percentage = Number(percentage);
    changes.push(`  percentage: ${old} → ${spec.percentage}`);
  }
  if (flags.fillStart) {
    const old = spec.fillColorStart;
    spec.fillColorStart = flags.fillStart;
    changes.push(`  fillColorStart: "${old}" → "${flags.fillStart}"`);
  }
  if (flags.fillEnd) {
    const old = spec.fillColorEnd;
    spec.fillColorEnd = flags.fillEnd;
    changes.push(`  fillColorEnd: "${old}" → "${flags.fillEnd}"`);
  }

  saveSpec(specPath, spec);

  console.log(`✓ Progress bar updated`);
  changes.forEach((c) => console.log(c));
  console.log(`  File: src/progress-bar-spec.json`);
}

function handleBlurScroller(args) {
  const { flags, positional } = parseFlags(args);
  const wordsInput = flags.words || positional[0];

  if (!wordsInput && !flags.fontSize && !flags.fontWeight && !flags.letterSpacing && !flags.bg && !flags.textColor) {
    console.error("Usage: set-text blur-scroller <comma-separated words>");
    console.error('  e.g. set-text blur-scroller "Motion,Emotion,Direction,Jitter,Life"');
    console.error("");
    console.error("Font & style flags:");
    console.error("  --fontSize <px>        Font size (default 68)");
    console.error("  --fontWeight <num>     Font weight (default 800)");
    console.error("  --letterSpacing <px>   Letter spacing (default -3)");
    console.error("  --bg <color>           Background color");
    console.error("  --textColor <color>    Text color");
    process.exit(1);
  }

  const specPath = SPECS["blur-scroller"];
  const spec = loadSpec(specPath);
  const changes = [];

  if (wordsInput) {
    const words = wordsInput.split(",").map((w) => w.trim()).filter(Boolean);
    if (words.length < 2) {
      console.error("✗ Need at least 2 words (comma-separated)");
      process.exit(1);
    }
    spec.words = words;
    changes.push(`words → [${words.join(", ")}] (${words.length} words)`);
  }
  if (flags.fontSize) {
    spec.fontSize = Number(flags.fontSize);
    changes.push(`fontSize → ${spec.fontSize}`);
  }
  if (flags.fontWeight) {
    spec.fontWeight = Number(flags.fontWeight);
    changes.push(`fontWeight → ${spec.fontWeight}`);
  }
  if (flags.letterSpacing) {
    spec.letterSpacing = Number(flags.letterSpacing);
    changes.push(`letterSpacing → ${spec.letterSpacing}`);
  }
  if (flags.bg) {
    spec.bgColor = flags.bg;
    changes.push(`bgColor → "${flags.bg}"`);
  }
  if (flags.textColor) {
    spec.textColor = flags.textColor;
    changes.push(`textColor → "${flags.textColor}"`);
  }

  saveSpec(specPath, spec);

  console.log(`✓ Blur scroller updated:`);
  for (const c of changes) console.log(`  ${c}`);
  console.log(`  File: src/blur-text-scroller-spec.json`);
}

// ── Vault Cards ──

function handleVaultCards(args) {
  const { flags, positional } = parseFlags(args);
  const tagline = flags.tagline || positional[0];
  const brand = flags.brand || positional[1];

  if (!tagline && !brand) {
    console.error("Usage: set-text vault-cards --tagline \"Your tagline\" --brand \"Brand\"");
    console.error("  --tagline  Center tagline text (use \\n for line breaks)");
    console.error("  --brand    Brand name below tagline");
    console.error('  e.g. set-text vault-cards --tagline "Pay smarter" --brand "Finco"');
    process.exit(1);
  }

  const specPath = SPECS["vault-cards"];
  const spec = loadSpec(specPath);
  const changes = [];

  if (tagline) {
    spec.tagline = tagline.replace(/\\n/g, "\n");
    changes.push(`tagline → "${tagline}"`);
  }
  if (brand) {
    spec.taglineBrand = brand;
    // Also update brand name on all credit cards
    for (const card of spec.cards) {
      if (card.brand) {
        card.brand = brand;
      }
    }
    changes.push(`brand → "${brand}" (tagline + all cards)`);
  }

  saveSpec(specPath, spec);

  console.log(`✓ Vault cards updated:`);
  for (const c of changes) console.log(`  ${c}`);
  console.log(`  File: src/vault-animated-cards-spec.json`);
}

// ── Tweet ──

function handleTweet(args) {
  const { flags, positional } = parseFlags(args);

  // Support both positional and flag-based args
  const name = flags.name || positional[0];
  const text = flags.text || positional[1];
  const handle = flags.handle;
  const timestamp = flags.timestamp;
  const source = flags.source;

  if (!name && !text && !handle && !timestamp && !source) {
    console.error("Usage: set-text tweet <displayName> <tweetText>");
    console.error('  e.g. set-text tweet "John Kappa" "Hello world!"');
    console.error("");
    console.error("Or use flags:");
    console.error('  set-text tweet --name "John" --handle "@john" --text "Hello!" --timestamp "1:00 PM · Mar 15, 2026" --source "Twitter Web App"');
    process.exit(1);
  }

  const specPath = SPECS["tweet"];
  const spec = loadSpec(specPath);

  const changes = [];
  if (name) {
    const old = spec.displayName;
    spec.displayName = name;
    changes.push(`  displayName: "${old}" → "${name}"`);
  }
  if (text) {
    const old = spec.tweetText;
    spec.tweetText = text;
    changes.push(`  tweetText: "${old}" → "${text}"`);
  }
  if (handle) {
    const old = spec.handle;
    spec.handle = handle;
    changes.push(`  handle: "${old}" → "${handle}"`);
  }
  if (timestamp) {
    const old = spec.timestamp;
    spec.timestamp = timestamp;
    changes.push(`  timestamp: "${old}" → "${timestamp}"`);
  }
  if (source) {
    const old = spec.source;
    spec.source = source;
    changes.push(`  source: "${old}" → "${source}"`);
  }

  saveSpec(specPath, spec);

  console.log(`✓ Tweet text updated`);
  changes.forEach((c) => console.log(c));
  console.log(`  File: src/tweet-spec.json`);
}

// ── Product Reveal Track ──

function handleProductReveal(args) {
  const { flags, positional } = parseFlags(args);

  const heroLabel = flags.heroLabel || flags.label || positional[0];
  const brandName = flags.brand;
  const productImage = flags.image;
  const bgImage = flags.bgImage || flags.bg;
  const bottomTagline = flags.tagline;
  const craftedText = flags.crafted;

  if (!heroLabel && !brandName && !productImage && !bgImage && !bottomTagline && !craftedText) {
    console.error("Usage: set-text product-reveal --label \"CO2\" --brand \"acme\"");
    console.error("  --label      Large hero text (e.g. CO2)");
    console.error("  --brand      Brand name (e.g. acme)");
    console.error("  --image      Product image path (relative to public/)");
    console.error("  --bg         Background image for dark scene (relative to public/)");
    console.error("  --tagline    Bottom tagline for final scene");
    console.error("  --crafted    Small crafted-in text (use \\n for line breaks)");
    console.error("");
    console.error('  e.g. set-text product-reveal --label "CO2" --brand "acme" --image "product-reveal-track/shoe.jpg"');
    process.exit(1);
  }

  const specPath = SPECS["product-reveal"];
  const spec = loadSpec(specPath);
  const changes = [];

  if (heroLabel) {
    spec.heroLabel = heroLabel;
    changes.push(`heroLabel → "${heroLabel}"`);
  }
  if (brandName) {
    spec.brandName = brandName;
    changes.push(`brandName → "${brandName}"`);
  }
  if (productImage) {
    spec.productImage = productImage;
    changes.push(`productImage → "${productImage}"`);
  }
  if (bgImage) {
    spec.bgImage = bgImage;
    changes.push(`bgImage → "${bgImage}"`);
  }
  if (bottomTagline) {
    spec.bottomTagline = bottomTagline.replace(/\\n/g, "\n");
    changes.push(`bottomTagline → "${bottomTagline}"`);
  }
  if (craftedText) {
    spec.craftedText = craftedText.replace(/\\n/g, "\n");
    changes.push(`craftedText → "${craftedText}"`);
  }

  saveSpec(specPath, spec);

  console.log(`✓ Product reveal track updated:`);
  for (const c of changes) console.log(`  ${c}`);
  console.log(`  File: src/product-reveal-track-spec.json`);
}

// ── White Social Handle ──

function handleSocialHandle(args) {
  const { flags, positional } = parseFlags(args);

  const handleText = flags.handle || flags.text || positional[0];
  const iconImage = flags.icon;

  if (!handleText && !iconImage) {
    console.error("Usage: set-text social-handle <handle>");
    console.error('  e.g. set-text social-handle "yourname.co"');
    console.error("");
    console.error("Or use flags:");
    console.error('  set-text social-handle --handle "yourname.co" --icon "social-handle/icon.png"');
    process.exit(1);
  }

  const specPath = SPECS["social-handle"];
  const spec = loadSpec(specPath);
  const changes = [];

  if (handleText) {
    const old = spec.handleText;
    spec.handleText = handleText;
    changes.push(`  handleText: "${old}" → "${handleText}"`);
  }
  if (iconImage) {
    spec.iconImage = iconImage;
    changes.push(`  iconImage → "${iconImage}"`);
  }

  saveSpec(specPath, spec);

  console.log(`✓ Social handle updated`);
  changes.forEach((c) => console.log(c));
  console.log(`  File: src/white-social-handle-spec.json`);
}

// ── Showreel Grid ──

function handleShowreelGrid(args) {
  const { flags, positional } = parseFlags(args);

  const folder = flags.folder || positional[0];
  const bgColor = flags.bgColor || flags.bg;

  if (!folder && !bgColor) {
    console.error("Usage: set-text showreel-grid --folder <public-subfolder> --bg <color>");
    console.error("  --folder   Subfolder in public/ to scan for images (e.g. showreel-grid)");
    console.error("  --bg       Background colour (e.g. #ecf2eb)");
    console.error("");
    console.error('  e.g. set-text showreel-grid --folder "showreel-grid" --bg "#ecf2eb"');
    console.error("");
    console.error("  Images are auto-discovered — just drop files into public/<folder>/");
    process.exit(1);
  }

  const specPath = SPECS["showreel-grid"];
  const spec = loadSpec(specPath);
  const changes = [];

  if (folder) {
    spec.screenFolder = folder;
    changes.push(`screenFolder → "${folder}"`);
  }
  if (bgColor) {
    spec.bgColor = bgColor;
    changes.push(`bgColor → "${bgColor}"`);
  }

  saveSpec(specPath, spec);

  console.log(`✓ Showreel grid updated:`);
  for (const c of changes) console.log(`  ${c}`);
  console.log(`  File: src/showreel-grid-spec.json`);
}

// ── Mobile Showreel Frames ──

function handleShowreelFrames(args) {
  const { flags, positional } = parseFlags(args);

  const bgColor = flags.bgColor || flags.bg;
  const slot = flags.slot != null ? Number(flags.slot) : null;
  const image = flags.image || positional[0];
  const holdMs = flags.hold;
  const scrollMs = flags.scroll;

  if (!bgColor && !image && slot == null && !holdMs && !scrollMs) {
    console.error("Usage: set-text showreel-frames --slot 0 --image \"path/to/img.jpg\"");
    console.error("  --slot    Image index (0-based) to replace");
    console.error("  --image   Image path (relative to public/)");
    console.error("  --bg      Background color");
    console.error("  --hold    Full-screen hold duration per card (ms, default 900)");
    console.error("  --scroll  Scroll transition duration (ms, default 500)");
    console.error("  --labelFont <font>  Label font family");
    console.error("  --labelFontSize <px> Label font size");
    console.error("");
    console.error('  e.g. set-text showreel-frames --slot 0 --image "mobile-showreel-frames/hero.jpg"');
    console.error('  e.g. set-text showreel-frames --bg "#1a1a2e"');
    process.exit(1);
  }

  const specPath = SPECS["showreel-frames"];
  const spec = loadSpec(specPath);
  const changes = [];

  if (bgColor) {
    spec.bgColor = bgColor;
    changes.push(`bgColor → "${bgColor}"`);
  }
  if (holdMs) {
    spec.cardHoldMs = Number(holdMs);
    changes.push(`cardHoldMs → ${spec.cardHoldMs}`);
  }
  if (scrollMs) {
    spec.scrollTransitionMs = Number(scrollMs);
    changes.push(`scrollTransitionMs → ${spec.scrollTransitionMs}`);
  }
  if (flags.labelFont) {
    spec.labelFont = flags.labelFont;
    changes.push(`labelFont → "${flags.labelFont}"`);
  }
  if (flags.labelFontSize) {
    spec.labelFontSize = Number(flags.labelFontSize);
    changes.push(`labelFontSize → ${spec.labelFontSize}`);
  }

  if (slot != null && image) {
    while (spec.images.length <= slot) {
      spec.images.push("");
    }
    const old = spec.images[slot];
    spec.images[slot] = image;
    changes.push(`images[${slot}]: "${old}" → "${image}"`);
  } else if (image && slot == null) {
    // Append image
    spec.images.push(image);
    changes.push(`images[${spec.images.length - 1}] (appended) → "${image}"`);
  }

  saveSpec(specPath, spec);

  console.log(`✓ Mobile showreel frames updated:`);
  for (const c of changes) console.log(`  ${c}`);
  console.log(`  File: src/mobile-showreel-frames-spec.json`);
}

// ── Stack Hiring handler ──

function handleStackHiring(args) {
  if (args.includes("--help") || args.includes("-h")) {
    console.error("Usage: set-text stack-hiring [options]");
    console.error("");
    console.error("Options:");
    console.error("  --title <text>       Title text (e.g. \"We're Hiring\")");
    console.error("  --roles <csv>        Comma-separated roles (e.g. \"Designer,Engineer\")");
    console.error("  --brand <name>       Brand name");
    console.error("  --url <url>          Brand URL");
    console.error("  --bg <color>         Background color");
    console.error("  --cta1 <text>        CTA line 1 (e.g. \"Build the\")");
    console.error("  --cta2 <text>        CTA line 2 (e.g. \"Future with us\")");
    console.error("  --button <text>      Button text (e.g. \"Apply Now\")");
    console.error("  --cta-bg <path>      CTA background image path");
    console.error("  --scroll <ms>        Scroll speed per role in ms");
    console.error("  --titleFont <font>   Title font family (e.g. \"Georgia, serif\")");
    console.error("  --titleFontSize <px> Title font size");
    console.error("  --roleFont <font>    Role font family (e.g. \"Helvetica Neue, Arial, sans-serif\")");
    console.error("  --roleFontSize <px>  Role font size");
    process.exit(0);
  }
  const specPath = SPECS["stack-hiring"];
  const spec = JSON.parse(readFileSync(specPath, "utf-8"));
  const { flags } = parseFlags(args);

  if (flags.title) spec.titleText = flags.title;
  if (flags.roles) spec.roles = flags.roles.split(",").map((r) => r.trim());
  if (flags.brand) spec.brandName = flags.brand;
  if (flags.url) spec.brandUrl = flags.url;
  if (flags.bg) spec.bgColor = flags.bg;
  if (flags.cta1) spec.ctaLine1 = flags.cta1;
  if (flags.cta2) spec.ctaLine2 = flags.cta2;
  if (flags.button) spec.ctaButton = flags.button;
  if (flags["cta-bg"]) spec.ctaBgImage = flags["cta-bg"];
  if (flags.scroll) spec.scrollSpeedMs = Number(flags.scroll);
  if (flags.footer1) spec.footerLine1 = flags.footer1;
  if (flags.footer2) spec.footerLine2 = flags.footer2;
  if (flags["cta-footer"]) spec.ctaFooterLine2 = flags["cta-footer"];
  if (flags.titleFont) spec.titleFont = flags.titleFont;
  if (flags.titleFontSize) spec.titleFontSize = Number(flags.titleFontSize);
  if (flags.roleFont) spec.roleFont = flags.roleFont;
  if (flags.roleFontSize) spec.roleFontSize = Number(flags.roleFontSize);

  writeFileSync(specPath, JSON.stringify(spec, null, 2) + "\n");
  console.log("✅ Updated stack-hiring spec:");
  console.log(`  Title: ${spec.titleText}`);
  console.log(`  Roles: ${spec.roles.join(", ")}`);
  console.log(`  Brand: ${spec.brandName} (${spec.brandUrl})`);
  console.log(`  CTA: ${spec.ctaLine1} ${spec.ctaLine2}`);
  console.log(`  Button: ${spec.ctaButton}`);
  console.log(`  File: src/stack-hiring-spec.json`);
}

// ── Slideshow Social handler ──

function handleSlideshow(args) {
  if (args.includes("--help") || args.includes("-h")) {
    console.error("Usage: set-text slideshow [options]");
    console.error("");
    console.error("Options:");
    console.error("  --slide <n>          Slide index (0-based) to edit");
    console.error("  --headline <text>    Headline text for the slide");
    console.error("  --image <path>       Replace first image on slide");
    console.error("  --images <csv>       Comma-separated image paths");
    console.error("  --layout <type>      Layout: twoImagesCentered, imageAboveTextBelow, fullBleedImage, gridLeftTextRight, imageLargeLeftTextRight");
    console.error("  --accent <color>     Accent color (line, text, dots)");
    console.error("  --bg <color>         Background color");
    console.error("  --copyright <text>   Copyright text");
    console.error("  --transition <ms>    Transition duration in ms");
    console.error("  --headlineFont <f>   Headline font family");
    console.error("  --headlineFontSize <px> Headline font size");
    console.error("  --bodyFont <font>    Body font family");
    console.error("  --bodyFontSize <px>  Body font size");
    process.exit(0);
  }
  const specPath = SPECS["slideshow"];
  const spec = JSON.parse(readFileSync(specPath, "utf-8"));
  const { flags } = parseFlags(args);

  if (flags.accent) {
    spec.accentColor = flags.accent;
    spec.textColor = flags.accent;
    spec.dotColor = flags.accent;
  }
  if (flags.bg) spec.bgColor = flags.bg;
  if (flags.copyright) spec.copyrightText = flags.copyright;
  if (flags.transition) spec.transitionMs = Number(flags.transition);
  if (flags.headlineFont) spec.headlineFont = flags.headlineFont;
  if (flags.headlineFontSize) spec.headlineFontSize = Number(flags.headlineFontSize);
  if (flags.bodyFont) spec.bodyFont = flags.bodyFont;
  if (flags.bodyFontSize) spec.bodyFontSize = Number(flags.bodyFontSize);

  const slideIdx = flags.slide !== undefined ? Number(flags.slide) : -1;
  if (slideIdx >= 0 && slideIdx < spec.slides.length) {
    const s = spec.slides[slideIdx];
    if (flags.headline) s.headline = flags.headline;
    if (flags.image) s.images[0] = flags.image;
    if (flags.images) s.images = flags.images.split(",").map((p) => p.trim());
    if (flags.layout) s.layout = flags.layout;
    if (flags.hold) s.holdMs = Number(flags.hold);
  } else if (flags.headline && slideIdx === -1) {
    // Update all slides' headlines to numbered versions
    spec.slides.forEach((s, i) => {
      s.headline = flags.headline + " " + String(i + 1).padStart(2, "0");
    });
  }

  writeFileSync(specPath, JSON.stringify(spec, null, 2) + "\n");
  console.log("✅ Updated slideshow spec:");
  spec.slides.forEach((s, i) => {
    console.log(`  Slide ${i}: [${s.layout}] "${s.headline}" (${s.images.length} images)`);
  });
  console.log(`  Accent: ${spec.accentColor}`);
  console.log(`  File: src/slideshow-social-spec.json`);
}

function handleDesignPreview(args) {
  if (args.includes("--help") || args.includes("-h")) {
    console.error("Usage: set-text design-preview [options]");
    console.error("");
    console.error("Options:");
    console.error("  --logo <text>          Logo text (e.g. \"BRAND©\")");
    console.error("  --bg <color>           Background color");
    console.error("  --logoBg <color>       Logo badge background color");
    console.error("  --logoText <color>     Logo badge text color");
    console.error("  --card <n>             Card index (0-based) to edit");
    console.error("  --image <path>         Card image path");
    console.error("  --dimensions <text>    Card dimensions text (e.g. \"1080 x 1080\")");
    console.error("  --portrait             Mark card as portrait");
    console.error("  --landscape            Mark card as landscape");
    console.error("  --categories <csv>     Comma-separated categories");
    console.error("  --cardWidth <px>       Card width in pixels");
    console.error("  --pillActive <color>   Active pill background color");
    console.error("  --pillInactive <color> Inactive pill background color");
    process.exit(0);
  }
  const specPath = SPECS["design-preview"];
  const spec = JSON.parse(readFileSync(specPath, "utf-8"));
  const { flags } = parseFlags(args);

  // Global options
  if (flags.logo) spec.logoText = flags.logo;
  if (flags.bg) spec.bgColor = flags.bg;
  if (flags.logoBg) spec.logoBgColor = flags.logoBg;
  if (flags.logoText) spec.logoTextColor = flags.logoText;
  if (flags.cardWidth) spec.cardWidth = Number(flags.cardWidth);
  if (flags.pillActive) spec.pillActiveColor = flags.pillActive;
  if (flags.pillInactive) spec.pillInactiveColor = flags.pillInactive;

  // Per-item options (items = cards + photos)
  const itemIdx = flags.card !== undefined ? Number(flags.card) : (flags.item !== undefined ? Number(flags.item) : -1);
  if (itemIdx >= 0 && itemIdx < spec.items.length) {
    const c = spec.items[itemIdx];
    if (flags.image) c.image = flags.image;
    if (flags.dimensions) c.dimensions = flags.dimensions;
    if (flags.categories) c.categories = flags.categories.split(",").map((s) => s.trim());
    if (flags.portrait !== undefined) c.isPortrait = true;
    if (flags.landscape !== undefined) c.isPortrait = false;
    if (flags.type) c.type = flags.type;
    if (flags.enter) c.enterMs = Number(flags.enter);
    if (flags.hold) c.holdMs = Number(flags.hold);
  }

  writeFileSync(specPath, JSON.stringify(spec, null, 2) + "\n");
  console.log("✅ Updated design-preview spec:");
  console.log(`  Logo: "${spec.logoText}" (bg: ${spec.logoBgColor})`);
  console.log(`  Background: ${spec.bgColor}`);
  console.log(`  Items: ${spec.items.length}`);
  spec.items.forEach((c, i) => {
    const label = c.type === "photo" ? "photo" : `${c.dimensions} ${c.isPortrait ? "portrait" : "landscape"}`;
    console.log(`    [${i}] ${c.type} ${label} @ (${c.x},${c.y}) enter:${c.enterMs}ms hold:${c.holdMs}ms → ${c.image}`);
  });
  console.log(`  File: src/design-preview-spec.json`);
}

function handleGenAiFeatures(args) {
  if (args.includes("--help") || args.includes("-h")) {
    console.error("Usage: set-text gen-ai-features [options]");
    console.error("");
    console.error("Options:");
    console.error("  --bg <color>           Background color");
    console.error("  --scene <1-4>          Scene to edit (required for scene-specific options)");
    console.error("  --image <path>         Scene image path (scenes 1-3)");
    console.error("  --fontSize <px>        Font size");
    console.error("  --logo <text>          Logo text (scene 4)");
    console.error("  --logoSuper <text>     Logo superscript (scene 4)");
    console.error("  --promptText <text>    Prompt box text (scene 2)");
    console.error("  --promptLabel <text>   Prompt box label (scene 2)");
    console.error("  --boldWords <csv>      Comma-separated bold words in prompt (scene 2)");
    process.exit(0);
  }
  const specPath = SPECS["gen-ai-features"];
  const spec = JSON.parse(readFileSync(specPath, "utf-8"));
  const { flags } = parseFlags(args);

  // Global options
  if (flags.bg) spec.bgColor = flags.bg;

  // Scene-specific options
  const sceneIdx = flags.scene ? Number(flags.scene) : -1;
  if (sceneIdx >= 1 && sceneIdx <= 4) {
    const scene = spec[`scene${sceneIdx}`];
    if (!scene) {
      console.error(`Scene ${sceneIdx} not found in spec.`);
      process.exit(1);
    }
    if (flags.image && sceneIdx <= 3) scene.image = flags.image;
    if (flags.fontSize) scene.fontSize = Number(flags.fontSize);

    // Scene 2 prompt box
    if (sceneIdx === 2 && scene.promptBox) {
      if (flags.promptText) scene.promptBox.text = flags.promptText;
      if (flags.promptLabel) scene.promptBox.label = flags.promptLabel;
      if (flags.boldWords) scene.promptBox.boldWords = flags.boldWords.split(",").map((s) => s.trim());
    }

    // Scene 4 logo
    if (sceneIdx === 4) {
      if (flags.logo) scene.logoText = flags.logo;
      if (flags.logoSuper) scene.logoSuperscript = flags.logoSuper;
    }
  }

  writeFileSync(specPath, JSON.stringify(spec, null, 2) + "\n");
  console.log("✅ Updated gen-ai-features spec:");
  console.log(`  Background: ${spec.bgColor}`);
  console.log(`  Duration: ${spec.durationMs}ms`);
  for (let i = 1; i <= 4; i++) {
    const s = spec[`scene${i}`];
    if (s) {
      const label = i === 4
        ? `Logo: "${s.logoText}" superscript: "${s.logoSuperscript}"`
        : `Image: ${s.image || "none"}, fontSize: ${s.fontSize}`;
      console.log(`  Scene ${i}: ${s.startMs}–${s.endMs}ms — ${label}`);
    }
  }
  console.log(`  File: src/gen-ai-features-spec.json`);
}

// ── Vault Card Features ──

function handleVaultCardFeatures(args) {
  const { flags, positional } = parseFlags(args);
  const subtitle = flags.subtitle || positional[0];
  const brand = flags.brand || positional[1];
  const words = flags.words;

  if (!subtitle && !brand && !words) {
    console.error("Usage: set-text vault-card-features --subtitle \"Your subtitle\" --brand \"Brand\"");
    console.error("  --subtitle  Subtitle text (e.g. \"Instant Digital Cards\")");
    console.error("  --brand     Brand name on cards and powered-by badge");
    console.error("  --words     Comma-separated feature words (e.g. \"Cards,Investing,Transfers\")");
    console.error('  e.g. set-text vault-card-features --subtitle "Instant Digital Cards" --brand "Finco"');
    process.exit(1);
  }

  const specPath = SPECS["vault-card-features"];
  const spec = loadSpec(specPath);
  const changes = [];

  if (subtitle) {
    spec.subtitle = subtitle;
    changes.push(`subtitle → "${subtitle}"`);
  }
  if (brand) {
    spec.poweredByBrand = brand;
    for (const card of spec.cards) {
      if (card.brand) {
        card.brand = brand;
      }
    }
    changes.push(`brand → "${brand}" (powered-by + all cards)`);
  }
  if (words) {
    spec.featureWords = words.split(",").map((w) => w.trim());
    changes.push(`featureWords → ${spec.featureWords.length} words`);
  }

  saveSpec(specPath, spec);

  console.log(`✓ Vault card features updated:`);
  for (const c of changes) console.log(`  ${c}`);
  console.log(`  File: src/vault-card-features-spec.json`);
}

// ── Showcase ──

function handleShowcase(args) {
  const { flags, positional } = parseFlags(args);
  const title = flags.title || positional[0];
  const website = flags.website || positional[1];
  const bgColor = flags.bg || flags.bgColor;

  if (!title && !website && !bgColor && !flags.titleFontSize) {
    console.error("Usage: set-text showcase --title \"Your Title\" --website \"www.site.com\"");
    console.error("  --title           Main title text");
    console.error("  --website         Website URL text");
    console.error("  --bg              Background color");
    console.error("  --titleFontSize <px>  Title font size");
    console.error('  e.g. set-text showcase --title "Design System" --website "www.design.co"');
    process.exit(1);
  }

  const specPath = SPECS["showcase"];
  const spec = loadSpec(specPath);
  const changes = [];

  if (title) {
    spec.title = title;
    changes.push(`title → "${title}"`);
  }
  if (website) {
    spec.website = website;
    changes.push(`website → "${website}"`);
  }
  if (bgColor) {
    spec.bgColor = bgColor;
    changes.push(`bgColor → "${bgColor}"`);
  }
  if (flags.titleFontSize) {
    spec.titleFontSize = Number(flags.titleFontSize);
    changes.push(`titleFontSize → ${spec.titleFontSize}`);
  }

  saveSpec(specPath, spec);

  console.log(`✓ Showcase updated:`);
  for (const c of changes) console.log(`  ${c}`);
  console.log(`  File: src/showcase-spec.json`);
}

// ── Route Text ──

function handleRouteText(args) {
  const { flags, positional } = parseFlags(args);
  const bg = flags.bg || flags.bgColor;
  const arrowColor = flags.arrowColor || flags.arrow;
  const row = flags.row !== undefined ? parseInt(flags.row) : undefined;
  const cities = flags.cities || positional[0];

  if (!bg && !arrowColor && cities === undefined && row === undefined && !flags.fontSize && !flags.rowHeight && !flags.textColor) {
    console.error("Usage: set-text route-text --row 0 --cities \"Paris,Lyon,Marseille\"");
    console.error("  --row        Row index (0-based)");
    console.error("  --cities     Comma-separated city names for the row");
    console.error("  --bg         Background color");
    console.error("  --textColor  Text color");
    console.error("  --arrowColor Arrow/separator color");
    console.error("  --fontSize <px>   Font size (default 220)");
    console.error("  --rowHeight <px>  Row height (default 270)");
    console.error('  e.g. set-text route-text --row 1 --cities "Tokyo,Osaka,Kyoto"');
    console.error('  e.g. set-text route-text --fontSize 180 --rowHeight 230');
    process.exit(1);
  }

  const specPath = SPECS["route-text"];
  const spec = loadSpec(specPath);
  const changes = [];

  if (bg) {
    spec.bgColor = bg;
    changes.push(`bgColor → "${bg}"`);
  }
  if (flags.textColor) {
    spec.textColor = flags.textColor;
    changes.push(`textColor → "${flags.textColor}"`);
  }
  if (arrowColor) {
    spec.arrowColor = arrowColor;
    changes.push(`arrowColor → "${arrowColor}"`);
  }
  if (flags.fontSize) {
    spec.fontSize = Number(flags.fontSize);
    changes.push(`fontSize → ${spec.fontSize}`);
  }
  if (flags.rowHeight) {
    spec.rowHeight = Number(flags.rowHeight);
    changes.push(`rowHeight → ${spec.rowHeight}`);
  }
  if (row !== undefined && cities) {
    const cityList = cities.split(",").map((c) => c.trim());
    if (spec.rows[row]) {
      spec.rows[row].cities = cityList;
      changes.push(`row ${row} cities → [${cityList.join(", ")}]`);
    } else {
      console.error(`Row ${row} does not exist (max: ${spec.rows.length - 1})`);
      process.exit(1);
    }
  }

  saveSpec(specPath, spec);

  console.log(`✓ RouteText updated:`);
  for (const c of changes) console.log(`  ${c}`);
  console.log(`  File: src/route-text-spec.json`);
}

// ── Web Screens ──

function handleWebScreens(args) {
  const { flags } = parseFlags(args);
  const bgStart = flags.bgStart || flags.bgColorStart;
  const bgEnd = flags.bgEnd || flags.bgColorEnd;

  if (!bgStart && !bgEnd) {
    console.error("Usage: set-text web-screens --bgStart <color> --bgEnd <color>");
    console.error("  --bgStart   Background gradient start color");
    console.error("  --bgEnd     Background gradient end color");
    console.error('  e.g. set-text web-screens --bgStart "#F0F9FF" --bgEnd "#17082C"');
    console.error("");
    console.error("  For loading screen images, use: npm run screens -- ./folder");
    process.exit(1);
  }

  const specPath = SPECS["web-screens"];
  const spec = loadSpec(specPath);
  const changes = [];

  if (bgStart) {
    spec.bgColorStart = bgStart;
    changes.push(`bgColorStart → "${bgStart}"`);
  }
  if (bgEnd) {
    spec.bgColorEnd = bgEnd;
    changes.push(`bgColorEnd → "${bgEnd}"`);
  }

  saveSpec(specPath, spec);

  console.log(`✓ Web screens updated:`);
  for (const c of changes) console.log(`  ${c}`);
  console.log(`  File: src/animated-web-screens-spec.json`);
}

// ── Main ──

const [template, ...rest] = process.argv.slice(2);

if (!template || !SPECS[template]) {
  console.log("set-text — Update template text from the command line\n");
  console.log("Templates:");
  console.log('  search-bar     npm run text:search-bar -- "query text"');
  console.log('  notification   npm run text:notification -- "Title" "Body message"');
  console.log('  inflate        npm run text:inflate -- "BOOM"');
  console.log('  progress-bar   npm run text:progress-bar -- 80');
  console.log('  blur-scroller  npm run text:blur-scroller -- "Word1,Word2,Word3"');
  console.log('  vault-cards    npm run text:vault-cards -- --tagline "Your tagline" --brand "Brand"');
  console.log('  tweet          npm run text:tweet -- "Display Name" "Tweet body text"');
  console.log('  product-reveal npm run text:product-reveal -- --label "CO2" --value "55.6"');
  console.log('  social-handle  npm run text:social-handle -- "yourname.co"');
  console.log('  showreel-grid  npm run text:showreel-grid -- --folder "showreel-grid" --bg "#ecf2eb"');
  console.log('  showreel-frames npm run text:showreel-frames -- --slot 0 --image "path.jpg"');
  console.log('  stack-hiring   npm run text:stack-hiring -- --roles "Designer,Engineer,PM"');
  console.log('  slideshow      npm run text:slideshow -- --slide 0 --headline "New Title"');
  console.log('  design-preview npm run text:design-preview -- --logo "BRAND©" --bg "#1a1a2e"');
  console.log('  gen-ai-features npm run text:gen-ai-features -- --bg "#111111" --scene 1 --image "path.png"');
  console.log('  vault-card-features npm run text:vault-card-features -- --subtitle "Instant Digital Cards" --brand "Acme"');
  console.log('  showcase       npm run text:showcase -- --title "Design System" --website "www.design.co"');
  console.log('  route-text     npm run text:route-text -- --row 0 --cities "Paris,Lyon,Marseille"');
  console.log('  web-screens    npm run text:web-screens -- --bgStart "#F0F9FF" --bgEnd "#17082C"');
  console.log("");
  console.log("Font flags (available on templates with font fields):");
  console.log('  stack-hiring:    --titleFont, --titleFontSize, --roleFont, --roleFontSize');
  console.log('  slideshow:       --headlineFont, --headlineFontSize, --bodyFont, --bodyFontSize');
  console.log('  showreel-frames: --labelFont, --labelFontSize');
  console.log('  blur-scroller:   --fontSize, --fontWeight, --letterSpacing');
  console.log('  route-text:      --fontSize, --rowHeight');
  console.log('  showcase:        --titleFontSize');
  console.log("");
  console.log("Examples:");
  console.log('  node scripts/set-text.mjs search-bar "How to edit videos with AI"');
  console.log('  node scripts/set-text.mjs notification "Mom" "Dinner is ready!"');
  console.log('  node scripts/set-text.mjs notification --title "Slack" --body "New message in #general" --timestamp "just now"');
  console.log('  node scripts/set-text.mjs inflate "EXPAND"');
  console.log('  node scripts/set-text.mjs progress-bar 80');
  console.log('  node scripts/set-text.mjs progress-bar --percentage 90 --fillStart "#00C853" --fillEnd "#69F0AE"');
  console.log('  node scripts/set-text.mjs blur-scroller "Motion,Emotion,Direction,Jitter,Life"');
  console.log('  node scripts/set-text.mjs vault-cards --tagline "Pay smarter" --brand "Finco"');
  console.log('  node scripts/set-text.mjs tweet "John Kappa" "Hello world!"');
  console.log('  node scripts/set-text.mjs tweet --name "John" --handle "@john" --text "Hello!"');
  console.log('  node scripts/set-text.mjs product-reveal --label "VO2" --value "62.1" --brand "NIKE"');
  console.log('  node scripts/set-text.mjs social-handle "yourname.co"');
  console.log('  node scripts/set-text.mjs showreel-grid --folder "showreel-grid" --bg "#ecf2eb"');
  console.log('  node scripts/set-text.mjs showreel-frames --slot 0 --image "mobile-showreel-frames/hero.jpg"');
  console.log('  node scripts/set-text.mjs showreel-frames --bg "#1a1a2e" --hold 1200');
  console.log('  node scripts/set-text.mjs stack-hiring --roles "Designer,Engineer" --brand "Acme"');
  console.log('  node scripts/set-text.mjs stack-hiring --title "Join Us" --cta1 "Shape" --cta2 "Tomorrow"');
  console.log('  node scripts/set-text.mjs slideshow --slide 0 --headline "My Title" --image "slideshow-social/hero.jpg"');
  console.log('  node scripts/set-text.mjs slideshow --accent "#0066FF" --bg "#111111"');
  console.log('  node scripts/set-text.mjs design-preview --logo "BRAND©" --bg "#1a1a2e"');
  console.log('  node scripts/set-text.mjs design-preview --card 0 --image "design-preview/new.png" --dimensions "1080 x 1080"');
  console.log('  node scripts/set-text.mjs web-screens --bgStart "#F0F9FF" --bgEnd "#17082C"');
  console.log('  node scripts/set-text.mjs stack-hiring --titleFont "Inter, sans-serif" --titleFontSize 80');
  console.log('  node scripts/set-text.mjs slideshow --headlineFont "Georgia, serif" --headlineFontSize 100');
  console.log('  node scripts/set-text.mjs blur-scroller --fontSize 80 --fontWeight 700');
  console.log('  node scripts/set-text.mjs route-text --fontSize 180 --rowHeight 230');
  process.exit(template ? 1 : 0);
}

switch (template) {
  case "search-bar":
    handleSearchBar(rest);
    break;
  case "notification":
    handleNotification(rest);
    break;
  case "inflate":
    handleInflate(rest);
    break;
  case "progress-bar":
    handleProgressBar(rest);
    break;
  case "blur-scroller":
    handleBlurScroller(rest);
    break;
  case "vault-cards":
    handleVaultCards(rest);
    break;
  case "tweet":
    handleTweet(rest);
    break;
  case "product-reveal":
    handleProductReveal(rest);
    break;
  case "social-handle":
    handleSocialHandle(rest);
    break;
  case "showreel-grid":
    handleShowreelGrid(rest);
    break;
  case "showreel-frames":
    handleShowreelFrames(rest);
    break;
  case "stack-hiring":
    handleStackHiring(rest);
    break;
  case "slideshow":
    handleSlideshow(rest);
    break;
  case "design-preview":
    handleDesignPreview(rest);
    break;
  case "gen-ai-features":
    handleGenAiFeatures(rest);
    break;
  case "vault-card-features":
    handleVaultCardFeatures(rest);
    break;
  case "showcase":
    handleShowcase(rest);
    break;
  case "route-text":
    handleRouteText(rest);
    break;
  case "web-screens":
    handleWebScreens(rest);
    break;
}
