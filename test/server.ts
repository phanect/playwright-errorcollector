import { Server } from "http";
import express = require("express");

export default class {
  private server: Server|undefined;
  private port: number;

  constructor(port: number) {
    this.port = port;
  }

  async start(): Promise<void> {
    const app = express();
    const port = this.port;

    app.get("/", (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <title>test</title>
            <script>
              throw new Error("This is a test error for playwright-errors.");
            </script>
          </head>
          <body>
            <a href="/popup" id="popup">Link to popup</a>
            <!-- <li> is not enclosed by e.g. <ul> -->
            <li>Hello, World!</li>
          </body>
        </html>
      `);
    });

    app.get("/too-large", (req, res) => {
      const tooLargeString = [ ...Array(99999).keys() ].join().toString();

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <title>test</title>
          </head>
          <body>
            <!-- <li> is not enclosed by e.g. <ul> -->
            <li>Hello, World!</li>
            <p>${tooLargeString}</p>
          </body>
        </html>
      `);
    });

    app.get("/popup", (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <title>test</title>
            <script>
              throw new Error("This is a test error from the popup window.");
            </script>
          </head>
          <body>
            <p>This is a popup window</p>
          </body>
        </html>
      `);
    });

    const self = this;

    return new Promise(resolve => {
      self.server = app.listen({ port }, () => resolve());
    });
  }

  async close(): Promise<void> {
    const self = this;

    return new Promise(resolve => {
      self.server?.close(() => resolve());
    });
  }
}
