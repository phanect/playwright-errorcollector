"use strict";

export interface Issue {
  pageURL: string;
  fileURL: string;
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
}
