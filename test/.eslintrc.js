"use strict";

const { join } = require("path");

module.exports = {
  extends: "plugin:@phanect/jest",
  parserOptions: {
    project: join(__dirname, "./tsconfig.json"),
  },
};
