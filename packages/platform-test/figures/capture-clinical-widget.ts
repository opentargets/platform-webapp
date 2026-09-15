/**
 * Capture the "Drugs and Clinical Candidates" widget for Figure 4D of the
 * Open Targets 2027 NAR Database Issue manuscript (manuscript_platform_nar26,
 * figures/figure_clinical_docs/).
 *
 * The figure places this screenshot as panel D, stretched to span row 1's
 * content width -- 20.9 of the composite's 23.0in, which prints at 168mm
 * (6.62in) given the OUP template's \textwidth of 185mm. Panel D's printed
 * HEIGHT is derived from this image's aspect ratio, so the capture geometry
 * here is what controls how much vertical space the panel takes on the page:
 *
 *     printed height (in) = 6.62 x H / W
 *     body text (pt)      = 14 x 72 x 6.62 / W
 *
 * where W and H are the captured CARD's width and height in css px -- not the
 * viewport's, since the card is inset by the page container. Those two are
 * coupled through W alone, because the widget's rows are fixed-pixel
 * (stage-filter header 140px, report rows ~59px, drug cards ~60px) and so H
 * barely moves when the viewport narrows. W is therefore set by the text-size
 * target, not by aesthetics: a ~1096px card puts body text at 6.1pt, about the
 * smallest that stays legible in print. Widening it to get a shorter panel
 * makes the text unreadable -- the capture this replaced was 1429px and printed
 * at 4.7pt. The only way to buy height back is to cut content, which is what the
 * chrome-stripping and row limits below do.
 *
 * deviceScaleFactor 4 gives ~660dpi at the printed width, inside NAR's
 * 300-600dpi ask with margin for the TIFF downsample.
 *
 * Every run prints the measured width/height, aspect, printed size, body-text
 * size and dpi. Check those rather than eyeballing the PNG.
 *
 * Usage (from packages/platform-test, with a dev server on :3000). Node >=22
 * strips the types itself, so no tsx/ts-node needed:
 *     node figures/capture-clinical-widget.ts
 *
 * Env overrides: CAPTURE_BASE_URL, CAPTURE_API_URL, CAPTURE_OUT,
 * CAPTURE_VIEWPORT_WIDTH, CAPTURE_DRUG_ROWS, CAPTURE_REPORT_ROWS,
 * CAPTURE_STAGE_HEADER_PX, CAPTURE_STAGE_FILTER_GAP_PX.
 */

import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.CAPTURE_BASE_URL ?? "http://localhost:3000";

// The published API, not the dev one the local .env points at -- the figure
// has to show the same data a reader would see. Injected as window.configUrlApi
// (which getConfig() reads ahead of VITE_API_URL) so no .env edit is needed.
const API_URL =
  process.env.CAPTURE_API_URL ?? "https://api.platform.opentargets.org/api/v4/graphql";

const OUT = resolve(
  process.env.CAPTURE_OUT ??
    "../../../manuscript_platform_nar26/figures/figure_clinical_docs/clinical_widget.png"
);

const DISEASE_ID = "MONDO_0004975"; // Alzheimer disease
const DRUG_NAME = "DONEPEZIL";
const STAGE_LABEL = "Phase III";

// The captured element is the section card, which is inset from the viewport by
// the page container's margins (~160px at this width). 1270 puts the card itself
// at ~1110px, which is what the pt/height arithmetic above is actually about --
// the script measures and reports the real card width rather than assuming it.
const VIEWPORT_WIDTH = Number(process.env.CAPTURE_VIEWPORT_WIDTH ?? 1270);
const DEVICE_SCALE_FACTOR = 4;

// 4 drugs on the left, per the figure spec. The right-hand count is what
// balances the two columns, and the right side is what sets the panel's height:
// its stage-filter header alone is ~130px against the left column's 4 x ~60px
// cards, so two reports is what "as many as fit beside 4 drugs" actually means.
// 3 also reads fine but adds ~0.36in to the printed panel and leaves the left
// column visibly short.
const DRUG_ROWS = Number(process.env.CAPTURE_DRUG_ROWS ?? 4);
const REPORT_ROWS = Number(process.env.CAPTURE_REPORT_ROWS ?? 2);

// The stage filter's <th> is 140px in RecordsCards to clear its rotated stage
// labels, and StageFilter itself reserves a 3rem bottom margin between the
// circles and the first report row. Both are trimmed here, but only together:
// the margin is what positions the circles (the grid is bottom-aligned), so
// shrinking the <th> alone drives the rotated labels up into the absolutely
// positioned "N reports for X" title, which sits at top:5 of the same box.
// Cutting the margin first pulls the whole filter down and away from the title,
// which is what makes the shorter header safe. 130/8 is the measured floor --
// below that "Unknown" starts clipping the title again.
const STAGE_HEADER_PX = Number(process.env.CAPTURE_STAGE_HEADER_PX ?? 130);
const STAGE_FILTER_GAP_PX = Number(process.env.CAPTURE_STAGE_FILTER_GAP_PX ?? 8);

const SECTION = '[data-testid="section-drugs"]';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: 1600 },
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    // Pin the UI to a known font stack + locale so the capture is reproducible
    // across machines rather than inheriting whatever the host has.
    locale: "en-GB",
    colorScheme: "light",
  });

  await context.addInitScript((apiUrl) => {
    (window as any).configUrlApi = apiUrl;
  }, API_URL);

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/disease/${DISEASE_ID}`, { waitUntil: "domcontentloaded" });

  // Sections lazy-load their Body chunk as they scroll into view.
  const section = page.locator(SECTION);
  await section.waitFor({ state: "visible", timeout: 90_000 });
  await section.scrollIntoViewIfNeeded();

  const tables = section.locator('[data-testid="ot-table"]');
  await tables.first().locator("tbody tr").first().waitFor({ timeout: 90_000 });

  // Select the drug. The drug name itself is a <Link> to /drug/<id>, so clicking
  // it would navigate away -- click the "Max stage:" caption in the same card,
  // which is inside the row's clickable Box but outside the link.
  const drugRow = section
    .locator('[data-testid="ot-table"]')
    .first()
    .locator("tbody tr")
    .filter({ has: page.getByText(DRUG_NAME, { exact: true }) })
    .first();
  await drugRow.getByText("Max stage:").click();

  // Right-hand panel appears once the records query resolves; it defaults to the
  // drug's max stage (Approval for donepezil), so the stage filter is only
  // clickable after that first render.
  const reportsTable = section.locator('[data-testid="ot-table"]').nth(1);
  await reportsTable.locator("tbody tr").first().waitFor({ timeout: 90_000 });

  // In StageFilter each stage is a grid cell holding a rotated label <span> and,
  // as a sibling, the circle itself (a <button> only when that stage has
  // records). The label is not inside the button, so reach the circle by going
  // up from the label to the cell: label -> 50px label box -> cell -> button.
  await section
    .getByText(STAGE_LABEL, { exact: true })
    .locator("xpath=../..")
    .locator("button")
    .click();
  await page.waitForTimeout(500);

  const geometry = await page.evaluate(
    ({ sectionSel, drugRows, reportRows, stageHeaderPx, stageFilterGapPx }) => {
      const root = document.querySelector(sectionSel) as HTMLElement;
      const hide = (el: Element | null | undefined) => {
        if (el) (el as HTMLElement).style.display = "none";
      };

      // Each OtTable renders as <div>[controls][scroller > table][footer]</div>.
      // Drop the controls row (Export / API query / Search) and the pagination
      // footer: chrome that costs ~110px of height and carries nothing the
      // figure needs to say.
      const tables = Array.from(root.querySelectorAll('[data-testid="ot-table"]'));
      for (const table of tables) {
        const scroller = table.parentElement as HTMLElement;
        const tableRoot = scroller.parentElement as HTMLElement;
        if (tableRoot.firstElementChild !== scroller) hide(tableRoot.firstElementChild);
        if (tableRoot.lastElementChild !== scroller) hide(tableRoot.lastElementChild);
        scroller.style.marginTop = "0";
      }

      // Trim each table to the row count the figure shows: drugs first, reports
      // second, in DOM order.
      const limits = [drugRows, reportRows];
      for (const [i, table] of tables.entries()) {
        const limit = limits[i];
        if (limit == null) continue;
        const rows = Array.from(table.querySelectorAll("tbody tr"));
        for (const [index, tr] of rows.entries()) {
          if (index >= limit) hide(tr);
        }
      }

      // Tighten the stage filter: pull the circles down toward the first report
      // row first, then shorten the header they sit in. Order matters only in
      // that both must happen -- see the constant's comment.
      for (const div of root.querySelectorAll("th div")) {
        const style = getComputedStyle(div);
        if (style.position === "absolute" && style.display === "grid") {
          (div as HTMLElement).style.marginBottom = `${stageFilterGapPx}px`;
        }
      }
      for (const th of root.querySelectorAll("th")) {
        (th as HTMLElement).style.height = `${stageHeaderPx}px`;
      }

      // MUI gives CardContent:last-child a 24px bottom padding against its 16px
      // top, which reads as a lopsided gap once the pagination footer below it
      // is gone. Match the top instead of cropping: the card is `variant=
      // "outlined"`, so trimming pixels off the image would cut its bottom
      // border and leave the box visibly open.
      const cardContent = root.querySelector(".MuiCardContent-root") as HTMLElement | null;
      if (cardContent) {
        cardContent.style.paddingBottom = getComputedStyle(cardContent).paddingTop;
      }

      const rect = root.getBoundingClientRect();

      // How much dead space sits below the last visible row. Trailing padding is
      // the cheapest height to give back, so it is worth seeing every run.
      const visibleRows = Array.from(root.querySelectorAll("tbody tr")).filter(
        (tr) => (tr as HTMLElement).style.display !== "none"
      );
      const lastBottom = visibleRows.reduce(
        (max, tr) => Math.max(max, tr.getBoundingClientRect().bottom),
        0
      );

      return {
        width: rect.width,
        height: rect.height,
        bottomGap: Math.round(rect.bottom - lastBottom),
      };
    },
    {
      sectionSel: SECTION,
      drugRows: DRUG_ROWS,
      reportRows: REPORT_ROWS,
      stageHeaderPx: STAGE_HEADER_PX,
      stageFilterGapPx: STAGE_FILTER_GAP_PX,
    }
  );

  // Park the pointer off-element: clicking the stage circle leaves it hovering
  // the report list, and the first title renders with its link underline showing.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);

  mkdirSync(dirname(OUT), { recursive: true });
  await section.screenshot({ path: OUT, scale: "device" });

  // The numbers that decide whether the panel works on the page, reported at
  // capture time so tuning doesn't mean re-deriving them by hand each round.
  // Against the captured card's own width, not the viewport: the card is inset
  // by the page container, and it is the card that gets stretched to 168mm.
  const PRINTED_WIDTH_IN = 6.62;
  const printedHeightIn = (PRINTED_WIDTH_IN * geometry.height) / geometry.width;
  const bodyTextPt = (14 * 72 * PRINTED_WIDTH_IN) / geometry.width;

  console.log(`written: ${OUT}`);
  console.log(
    `  capture      ${Math.round(geometry.width)} x ${Math.round(geometry.height)} css px`
  );
  console.log(
    `  image        ${Math.round(geometry.width * DEVICE_SCALE_FACTOR)} x ${Math.round(
      geometry.height * DEVICE_SCALE_FACTOR
    )} px`
  );
  console.log(`  aspect       ${(geometry.width / geometry.height).toFixed(3)}`);
  console.log(`  bottom gap   ${geometry.bottomGap} css px below last row`);
  console.log(`  printed      ${PRINTED_WIDTH_IN.toFixed(2)} x ${printedHeightIn.toFixed(2)} in`);
  console.log(`  body text    ${bodyTextPt.toFixed(1)} pt`);
  console.log(
    `  resolution   ${Math.round((geometry.width * DEVICE_SCALE_FACTOR) / PRINTED_WIDTH_IN)} dpi`
  );

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
