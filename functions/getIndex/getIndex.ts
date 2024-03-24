import { Handler } from "aws-lambda";
import http from "axios";
import * as fs from "fs";
// Not sure why this has to be a require but the import doesn't work, and their docs also use require...
const mustache = require("mustache");

/**
 * Notice that the variable html is declared and assigned OUTSIDE the handler function.
 * The declaration and assignment code will run ONLY the first time our code executes in a new worker instance (an instance of a micro VM running this Lambda function).
 * The same goes for any variables you declare outside the handler function, such as the fs module which we required at the top.
 * This helps improve performance and allows us to load and cache static data only on the first invocation, which helps improve performance on subsequent invocations.
 */
let html: string;
const restaurantsApiRoot = process.env.restaurants_api || "";
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const loadHtml = () => {
  if (!html) {
    html = fs.readFileSync("static/index.html", "utf-8");
  }
  return html;
};

const getRestaurants = async () => {
  const httpReq = http.get(restaurantsApiRoot);
  return (await httpReq).data;
};

export const handler: Handler = async (event, context) => {
  const template = loadHtml();
  const restaurants = await getRestaurants();
  const dayOfWeek = days[new Date().getDay()];
  const renderedHtml = mustache.render(template, { dayOfWeek, restaurants });

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
    },
    body: renderedHtml,
  };
};
