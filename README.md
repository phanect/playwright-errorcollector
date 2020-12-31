# playwright-errors

![GitHub Actions Status](https://github.com/phanect/sitegazer/workflows/GitHub%20Actions/badge.svg)

playwright-errors automatically collects browser console errors, network errors, and HTML errors by running browser-automation script of [Playwright](https://playwright.dev/).

## Requirement

- Node.js 10.x, 12.x, 14.x, or 15.x
- Playwright (latest version recommended)
- Java 8+ (if you want to collect HTML errors)

## Install

```shell
$ npm install playwright-errors
```

or

```shell
$ yarn add playwright-errors
```

## Example

```javascript
"use strict";

import { chromium, firefox, webkit } from "playwright";
import { initErrorCollector } from "playwright-errors";

(async () => {
  for (const browserType of [ chromium, firefox, webkit ]) {
    const browser = await browserType.launch();
    const { context, collector } = initErrorCollector(await browser.newContext());
    const page = await context.newPage();

    await page.goto("https://playwright.dev/");
    await collector.waitForErrorCollection();

    await page.click("a[href='/docs/intro']");

    const issues = await collector.dump();
    console.log(JSON.stringify(issues, null, 2));

    await browser.close();
  }
})();
```

## API

### `playwright-errors` module

#### function: `initErrorCollector(browserContext, options)`

Initialize error collector for the given `BrowserContext` object.

- `browserContext`: `BrowserContext` - Playwright's `BrowserContext` object to audit.
- `options`: `object` - Error collection options.
  - `html`: `boolean` - If `false`, disable collecting HTML errors. `true` by default.
- returns: `Promise<{ context, collector }>`
  - `context`: `BrowserContext` - The initialized `BrowserContext` object. `playwright-errors` collects the errors raised in the pages opened in this context.
  - `collector`: `ErrorCollector` - The `ErrorCollector` object for the corresponding `context`.

### class: `ErrorCollector`

#### method: `waitForErrorCollection()`

Wait for `networkidle` and error collection proceess has finished.
Make sure to put this method before moving to another page to collect errors more accurately.

- returns: `Promise<void>`

#### method: `dump()`

Returns collected errors.

- returns: `Promise<ErrorCollection[]>`

### interface: `ErrorCollection`

Example:

```javascript
{
  "url": "https://example.com/",
  "files": [
    {
      "url": "https://example.com/",
      "issues": [
        {
          "category": "html",
          "message": "An “img” element must have an “alt” attribute, except under certain conditions. For details, consult guidance on providing text alternatives for images.",
          "line": {
            "start": 23,
            "end": 23
          },
          "column": {
            "start": 7789,
            "end": 7820
          }
        },
        {
          "category": "html",
          "message": "An “img” element must have an “alt” attribute, except under certain conditions. For details, consult guidance on providing text alternatives for images.",
          "line": {
            "start": 23,
            "end": 23
          },
          "column": {
            "start": 7877,
            "end": 7906
          }
        },
      ]
    },
  ]
}
```

#### property: `url`: `string`

Page URL where the errors are raised.

#### property: `files[].url`: `string`

The file URL where the errors are raised.
For example, If the error is raised in https://example.com/a.js which is embedded in https://example.com/, the page URL should be https://example.com/ and the file URL should be https://example.com/a.js.

#### property: `files[].issues[].category`: `"console" | "network" | "html"`

The category of this issue.

- `console` - Messages from the browser console.
- `network` - Network request failures.
- `html` - HTML errors found by Nu HTML Checker.

#### property: `files[].issues[].message`: `string`

The error/warning message.

#### property: `files[].issues[].line`: `{ start: number, end: number }`

The line where the error raised.

#### property: `files[].issues[].column`: `{ start: number, end: number }`

The column where the error raised.

## License

[MIT](https://opensource.org/licenses/MIT)

&copy; 2021 Jumpei Ogawa
