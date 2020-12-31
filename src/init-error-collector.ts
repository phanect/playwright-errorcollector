import { BrowserContext } from "playwright";
import { vnu } from "vnu";

import { ErrorCollector } from "./ErrorCollector";
import { sleep } from "./utils";

interface ErrorCollectorOptions {
  html?: boolean;
}

function extractInfoFromError(err: Error): { fileURL?: string, line: number, column: number } {
  // line 1: " Error: Something is wrong in desktop site."
  // line 2: "        at http://localhost:3456/:7:23"
  const stacktrace = err.stack?.trim().split("\n") ?? [];

  // Chrome's stacktrace format
  if (stacktrace[0].trim().endsWith(err.message)) {
    stacktrace.shift(); // Remove error message in the first line

    for (const trace of stacktrace) {
      const destructuredStacktrace = trace
        .trim() // "        at http://localhost:3456/:7:23" -> "at http://localhost:3456/:7:23"
        .replace("at ", "") // "at http://localhost:3456/:7:23" -> "http://localhost:3456/:7:23"
        .split(":"); // "http://localhost:3456/:7:23" -> [ "http", "//localhost", "3456/" "7", "23" ]
      const column = parseInt(destructuredStacktrace.pop() ?? "0");
      const line = parseInt(destructuredStacktrace.pop() ?? "0");
      const fileURL = destructuredStacktrace.join(":");

      if (fileURL === "<anonymous>") {
        continue;
      }

      return { fileURL, line, column };
    }
  } else { // Firefox & WebKit's stacktrace format
    for (const trace of stacktrace) {
      const destructuredStacktrace = trace
        .trim() // " global code@http://localhost:3456/:7:23 " -> "global code@http://localhost:3456/:7:23"
        .split("@")[1] // "global code@http://localhost:3456/:7:23" -> [ "global code", "http://localhost:3456/:7:23" ]
        .split(":"); // "http://localhost:3456/:7:23" -> [ "http", "//localhost", "3456/" "7", "23" ]
      const column = parseInt(destructuredStacktrace.pop() ?? "0");
      const line = parseInt(destructuredStacktrace.pop() ?? "0");
      const fileURL = destructuredStacktrace.join(":");

      if (fileURL === "<anonymous>") {
        continue;
      }

      return { fileURL, line, column };
    }
  }

  return {
    line: 0,
    column: 0,
  };
}

export function initErrorCollector(context: BrowserContext, options: ErrorCollectorOptions = { html: true }): ({ context: BrowserContext, collector: ErrorCollector }) {
  const collector = new ErrorCollector(context);

  context.on("page", (page) => {
    page.on("console", (msg) => {
      const msgType = msg.type();

      if (
        // To avoid duplicate error with one raised by pageerror event on Firefox, error type message is not reported here.
        // msgType === "error" ||
        msgType === "warning" ||
        msgType === "assert" ||
        msgType === "trace"
      ) {
        const location = msg.location();
        collector.add({
          pageURL: page.url(),
          fileURL: location.url,
          category: "console",
          message: msg.text().trim(),
          line: {
            start: location.lineNumber,
            end: location.lineNumber,
          },
          column: {
            start: location.columnNumber,
            end: location.columnNumber,
          },
        });
      }
    }).on("pageerror", (err) => {
      const { fileURL, line, column } = extractInfoFromError(err);

      collector.add({
        pageURL: page.url(),
        fileURL: fileURL ?? page.url(),
        category: "console",
        message: err.message,
        line: {
          start: line,
          end: line,
        },
        column: {
          start: column,
          end: column,
        },
      });
    }).on("requestfailed", (req) => {
      collector.add({
        pageURL: page.url(),
        fileURL: req.url(),
        category: "network",
        message: req.failure()?.errorText ?? "Unexpected request failure",
        line: {
          start: 0, // TODO
          end: 0, // TODO
        },
        column: {
          start: 0, // TODO
          end: 0, // TODO
        },
      });
    }).on("requestfinished", (req) => {
      const promise = (async () => {
        // Wait for 1s to ensure page.url() is switched from about:blank to the actual URL
        await sleep(1000);

        const pageURL = page.url();
        const reqURL = req.url();
        const res = await req.response();

        const status = res?.status() ?? 999;
        if (res === null || 400 <= status) {
          // TODO: Workaround for https://github.com/microsoft/playwright/issues/5542
          // Ignore even if res is null.
          // Remove the following if block when this issue is resolved.
          if (res === null) {
            return;
          }

          collector.add({
            pageURL,
            fileURL: reqURL,
            category: "network",
            message: res ? `${status} ${res.statusText()}` : "Unexpected failure on request",
            line: {
              start: 0, // TODO
              end: 0, // TODO
            },
            column: {
              start: 0, // TODO
              end: 0, // TODO
            },
          });
        }

        if (pageURL === reqURL && options.html !== false) {
          const warnings = await vnu(pageURL);

          collector.add(warnings.map(warning => ({
            pageURL,
            fileURL: pageURL,
            category: "html",
            message: warning.message,
            line: {
              start: warning.firstLine ?? warning.lastLine,
              end: warning.lastLine,
            },
            column: {
              start: warning.firstColumn ?? warning.lastColumn,
              end: warning.lastColumn,
            },
          })));
        }
      })();
      collector.addPromiseToWaitFor(promise);
    });
  });

  return { context, collector };
}
