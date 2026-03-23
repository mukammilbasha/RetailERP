#!/usr/bin/env node

/**
 * generate-icons.js
 *
 * Generates PWA icon PNGs from the project's SVG icon using the HTML Canvas API
 * via a headless approach. This script creates a simple HTML page, renders the
 * SVG onto canvases at 192x192 and 512x512, then exports them as PNG data URLs.
 *
 * Prerequisites:
 *   npm install canvas   (or use puppeteer for browser-based rendering)
 *
 * Usage:
 *   node scripts/generate-icons.js
 *
 * If the `canvas` package is not available, this script falls back to generating
 * a shell script that uses Inkscape or rsvg-convert.
 */

const fs = require("fs");
const path = require("path");

const ICONS_DIR = path.resolve(__dirname, "../public/icons");
const SVG_PATH = path.join(ICONS_DIR, "icon.svg");

// Sizes to generate
const SIZES = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-maskable.png", size: 512, maskable: true },
];

/**
 * Attempt to generate icons using the `canvas` npm package.
 */
async function generateWithCanvas() {
  const { createCanvas, loadImage } = require("canvas");
  const svgData = fs.readFileSync(SVG_PATH, "utf-8");

  for (const icon of SIZES) {
    const canvas = createCanvas(icon.size, icon.size);
    const ctx = canvas.getContext("2d");

    if (icon.maskable) {
      // Maskable icons need 10% safe zone padding per the spec.
      // Fill the entire canvas with the background color, then draw the
      // SVG scaled down to 80% centered.
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, icon.size, icon.size);

      const padding = Math.round(icon.size * 0.1);
      const innerSize = icon.size - padding * 2;

      const img = await loadImage(Buffer.from(svgData));
      ctx.drawImage(img, padding, padding, innerSize, innerSize);
    } else {
      const img = await loadImage(Buffer.from(svgData));
      ctx.drawImage(img, 0, 0, icon.size, icon.size);
    }

    const buffer = canvas.toBuffer("image/png");
    const outPath = path.join(ICONS_DIR, icon.name);
    fs.writeFileSync(outPath, buffer);
    console.log(`  Created ${outPath} (${icon.size}x${icon.size})`);
  }
}

/**
 * Fallback: generate a helper shell script that can produce PNGs
 * using common CLI tools (Inkscape, rsvg-convert, or ImageMagick).
 */
function generateFallbackScript() {
  const script = `#!/usr/bin/env bash
# Auto-generated icon conversion script.
# Requires one of: Inkscape, rsvg-convert, or ImageMagick (convert).
#
# Usage:
#   chmod +x generate-icons.sh && ./generate-icons.sh

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
ICONS_DIR="\${SCRIPT_DIR}/../public/icons"
SVG="\${ICONS_DIR}/icon.svg"

convert_svg() {
  local size=\$1
  local output=\$2
  local padding=\${3:-0}

  if command -v inkscape &>/dev/null; then
    inkscape -w "\$size" -h "\$size" "\$SVG" -o "\$output"
  elif command -v rsvg-convert &>/dev/null; then
    rsvg-convert -w "\$size" -h "\$size" "\$SVG" -o "\$output"
  elif command -v magick &>/dev/null; then
    magick -background none -resize "\${size}x\${size}" "\$SVG" "\$output"
  elif command -v convert &>/dev/null; then
    convert -background none -resize "\${size}x\${size}" "\$SVG" "\$output"
  else
    echo "Error: No SVG-to-PNG converter found."
    echo "Install one of: inkscape, librsvg (rsvg-convert), or imagemagick."
    exit 1
  fi

  echo "  Created \$output (\${size}x\${size})"
}

echo "Generating PWA icons..."
convert_svg 192 "\${ICONS_DIR}/icon-192.png"
convert_svg 512 "\${ICONS_DIR}/icon-512.png"

# For maskable icon, we generate at 512 with the SVG (which already has
# internal padding via the rounded rect background).
convert_svg 512 "\${ICONS_DIR}/icon-maskable.png"

echo "Done!"
`;

  const outPath = path.join(__dirname, "generate-icons.sh");
  fs.writeFileSync(outPath, script, { mode: 0o755 });
  console.log(`  Created fallback shell script at ${outPath}`);
  console.log("  Run it with: bash scripts/generate-icons.sh");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("RetailERP PWA Icon Generator");
  console.log("============================\n");
  console.log(`SVG source: ${SVG_PATH}`);
  console.log(`Output dir: ${ICONS_DIR}\n`);

  if (!fs.existsSync(SVG_PATH)) {
    console.error(`Error: SVG icon not found at ${SVG_PATH}`);
    process.exit(1);
  }

  // Ensure icons directory exists
  fs.mkdirSync(ICONS_DIR, { recursive: true });

  try {
    require.resolve("canvas");
    console.log("Using `canvas` npm package for rendering...\n");
    await generateWithCanvas();
  } catch {
    console.log(
      "The `canvas` npm package is not installed. Generating fallback shell script...\n"
    );
    console.log("  To install: npm install --save-dev canvas\n");
    generateFallbackScript();
  }

  console.log("\nIcon generation complete.");
}

main().catch((err) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
