import { chromium, firefox, webkit, ChromiumBrowser, FirefoxBrowser, WebKitBrowser, Browser, BrowserType, LaunchOptions, Page } from "playwright";

import { ErrorCollector, initErrorCollector } from "../src/index";
import Server from "./server";
import { sortObjects } from "./testutils";

const launchOptions: LaunchOptions = {
  // headless: false,
  // devtools: true,
};

const port = 3456;
const url = `http://localhost:${port}`;

let server: Server;
let browser: Browser;

beforeEach(async () => {
  server = new Server(port);
  await server.start();
});

afterEach(async () => {
  await Promise.all([
    server.close(),
    browser?.close(),
  ]);
});

async function newPage(browserType: BrowserType<ChromiumBrowser|FirefoxBrowser|WebKitBrowser>): Promise<{ page: Page, collector: ErrorCollector}> {
  if (browserType.name() === "chromium") {
    launchOptions.executablePath = "/usr/bin/google-chrome";
  } else {
    delete launchOptions.executablePath;
  }

  browser = await browserType.launch(launchOptions);
  const { context, collector } = initErrorCollector(await browser.newContext());
  return { page: await context.newPage(), collector };
}

for (const browserType of [ chromium, firefox, webkit ]) {
  const browserName = browserType.name();

  test(`[${browserName}] lints the given URLs`, async () => {
    const { page, collector } = await newPage(browserType);

    await page.goto(url);
    await collector.waitForErrorCollection();
    const pages = await collector.dump();

    expect(sortObjects(pages)).toEqual(sortObjects([
      {
        url: `http://localhost:${port}/`,
        files: [{
          url: `http://localhost:${port}/`,
          issues: [
            {
              message: "This is a test error for playwright-errors.",
              category: "console",
              line: {
                start: 7,
                end: 7,
              },
              column: {
                // On WebKit, the end column (77 in this case) of the code is shown as error point.
                // On Chrome and Firefox, the start column (21 in this case) of the code is shown.
                start: browserName === "webkit" ? 77 : 21,
                end: browserName === "webkit" ? 77 : 21,
              },
            },
            {
              message: "Element “li” not allowed as child of element “body” in this context. (Suppressing further errors from this subtree.)",
              category: "html",
              line: {
                start: 13,
                end: 13,
              },
              column: {
                start: 13,
                end: 16,
              },
            },
          ],
        }],
      },
    ]));
  }, 30000);

  test(`[${browserName}] when html check is disabled`, async () => {
    const browser = await browserType.launch(launchOptions);
    const { context, collector } = initErrorCollector(await browser.newContext(), { html: false });
    const page = await context.newPage();
    await page.goto(url);
    await collector.waitForErrorCollection();
    const pages = await collector.dump();

    expect(sortObjects(pages)).toEqual(sortObjects([
      {
        url: `http://localhost:${port}/`,
        files: [{
          url: `http://localhost:${port}/`,
          issues: [{
            message: "This is a test error for playwright-errors.",
            category: "console",
            line: {
              start: 7,
              end: 7,
            },
            column: {
              // On WebKit, the end column (77 in this case) of the code is shown as error point.
              // On Chrome and Firefox, the start column (21 in this case) of the code is shown.
              start: browserName === "webkit" ? 77 : 21,
              end: browserName === "webkit" ? 77 : 21,
            },
          }],
        }],
      },
    ]));
  }, 20000);

  test(`[${browserName}] lints the page on the popup window`, async () => {
    const { page, collector } = await newPage(browserType);

    await page.goto(url);
    await collector.waitForErrorCollection();
    await page.click("#popup");
    const pages = await collector.dump();

    expect(sortObjects(pages)).toEqual(sortObjects([
      {
        url: `http://localhost:${port}/`,
        files: [{
          url: `http://localhost:${port}/`,
          issues: [
            {
              message: "This is a test error for playwright-errors.",
              category: "console",
              line: {
                start: 7,
                end: 7,
              },
              column: {
                // On WebKit, the end column (77 in this case) of the code is shown as error point.
                // On Chrome and Firefox, the start column (21 in this case) of the code is shown.
                start: browserName === "webkit" ? 77 : 21,
                end: browserName === "webkit" ? 77 : 21,
              },
            },
            {
              message: "Element “li” not allowed as child of element “body” in this context. (Suppressing further errors from this subtree.)",
              category: "html",
              line: {
                start: 13,
                end: 13,
              },
              column: {
                start: 13,
                end: 16,
              },
            },
          ],
        }],
      },
      {
        url: `http://localhost:${port}/popup`,
        files: [{
          url: `http://localhost:${port}/popup`,
          issues: [{
            message: "This is a test error from the popup window.",
            category: "console",
            line: {
              start: 7,
              end: 7,
            },
            column: {
              // On WebKit, the end column (77 in this case) of the code is shown as error point.
              // On Chrome and Firefox, the start column (21 in this case) of the code is shown.
              start: browserName === "webkit" ? 77 : 21,
              end: browserName === "webkit" ? 77 : 21,
            },
          }],
        }],
      },
    ]));
  }, 30000);
}

test("HTML error check is properly done when large HTML is given", async () => {
  const browser = await chromium.launch(launchOptions);
  const { context, collector } = initErrorCollector(await browser.newContext());
  const page = await context.newPage();
  await page.goto(`http://localhost:${port}/too-large`);
  await collector.waitForErrorCollection();
  const pages = await collector.dump();

  expect(sortObjects(pages)).toEqual(sortObjects([
    {
      url: `http://localhost:${port}/too-large`,
      files: [{
        url: `http://localhost:${port}/too-large`,
        issues: [{
          message: "Element “li” not allowed as child of element “body” in this context. (Suppressing further errors from this subtree.)",
          category: "html",
          line: {
            start: 9,
            end: 9,
          },
          column: {
            start: 13,
            end: 16,
          },
        }],
      }],
    },
  ]));
}, 20000);
