import { Handler } from "aws-lambda";
import { sign } from "aws4";
import http, { AxiosHeaders } from "axios";
import * as fs from "fs";
import * as URL from "url";
// Not sure why this has to be a require but the import doesn't work, and their docs also use require...
const mustache = require("mustache");

const awsRegion = process.env.AWS_REGION;
const cognitoClientId = process.env.cognito_client_id;
const cognitoUserPoolId = process.env.cognito_user_pool_id;
const ordersApiRoot = process.env.orders_api || "";
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

const template = fs.readFileSync("static/index.html", "utf-8");

const getRestaurants = async () => {
  console.log("GETTING RESTAURANTS: ", restaurantsApiRoot);
  const url = URL.parse(restaurantsApiRoot);
  try {
    const httpReq = http.get(restaurantsApiRoot, {
      headers: sign({
        host: url.hostname || undefined,
        path: url.pathname || undefined,
      })?.headers as AxiosHeaders,
    });
    const data = (await httpReq).data;
    return data;
  } catch (e) {
    console.error("Error getting restaurants: ", e);
    return [];
  }
};

export const handler: Handler = async (event, context) => {
  const restaurants = await getRestaurants();
  const dayOfWeek = days[new Date().getDay()];
  const renderedHtml = mustache.render(template, {
    awsRegion,
    cognitoClientId,
    cognitoUserPoolId,
    dayOfWeek,
    restaurants,
    searchUrl: `${restaurantsApiRoot}/search`,
    placeOrderUrl: `${ordersApiRoot}`,
  });

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
    },
    body: renderedHtml,
  };
};
