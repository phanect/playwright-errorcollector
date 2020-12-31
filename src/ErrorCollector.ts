import sortBy from "lodash/sortBy";
import { BrowserContext } from "playwright";

import { Issue } from "./interfaces/Issue";
import { Page } from "./interfaces/Page";
import { sleep } from "./utils";

/*
 * Example:
 *
 * {
 *   "https://example.com/foo.html": {
 *     "https://example.com/foo.js": {
 *       pluginName: "Chrome Console",
 *       message: "Error: Something went wrong",
 *       line: 5,
 *       column: 14,
 *     },
 *     "https://example.com/boo.js": {
 *       pluginName: "Chrome Console",
 *       message: "Error: Something went wrong",
 *       line: 12,
 *       column: 11,
 *     }
 *   },
 *   "https://example.com/bar.html": {
 *     "https://example.com/bar.js": {
 *       pluginName: "Chrome Console",
 *       message: "Error: Something went wrong",
 *       line: 2,
 *       column: 6,
 *     },
 *   }
 * }
 */
interface InternalErrorList {
  [pageURL: string]: {
    [fileURL: string]: {
      category: "html"|"console"|"network";
      message: string;
      line: {
        start: number;
        end: number;
      };
      column: {
        start: number;
        end: number;
      };
    }[];
  };
}

export class ErrorCollector {
  private errorList: InternalErrorList = {};
  private promisesToWaitFor: Promise<unknown>[] = [];

  constructor(private context: BrowserContext) {}

  public add(issues: Issue|Issue[]): void {
    const _issues = (Array.isArray(issues)) ? issues : [ issues ];

    for (const issue of _issues) {
      if (typeof this.errorList[issue.pageURL] !== "object") {
        this.errorList[issue.pageURL] = {};
      }
      if (!Array.isArray(this.errorList[issue.pageURL][issue.fileURL])) {
        this.errorList[issue.pageURL][issue.fileURL] = [];
      }

      this.errorList[issue.pageURL][issue.fileURL].push({
        category: issue.category,
        message: issue.message,
        line: issue.line,
        column: issue.column,
      });
    }
  }

  public async dump(): Promise<Page[]> {
    let pages: Page[] = [];

    await this.waitForErrorCollection();

    const _pages = sortBy(Object.entries(this.errorList).map(([ pageURL, files ]) => ({
      url: pageURL,
      files: sortBy(Object.entries(files).map(([ fileURL, issues ]) => ({
        url: fileURL,
        issues: sortBy(issues, [ "line", "column", "category" ]),
      })), [ "url" ]),
    })), [ "url" ]);

    pages = pages.concat(_pages);

    return pages;
  }

  public addPromiseToWaitFor(promise: Promise<unknown>): void {
    this.promisesToWaitFor.push(promise);
  }

  public async waitForErrorCollection(): Promise<void> {
    const pages = this.context.pages();
    await Promise.all(pages.map(page => page.waitForLoadState("networkidle")));
    await sleep(2000); // Wait for 2s to collect errors which are raised after networkidle

    // Wait for pages loaded first, then wait for the promises.
    // If not, when dump() start before requestfinished event,
    // this program does not wait for the processes triggered by requestfinished.
    await Promise.all(this.promisesToWaitFor);
  }
}
