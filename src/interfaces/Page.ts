"use strict";

export interface Page {
  url: string;
  files: {
    url: string;
    issues: {
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
  }[];
}
