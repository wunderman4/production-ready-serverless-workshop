import { sign } from "aws4";
import http, { AxiosHeaders } from "axios";
import { get } from "lodash";
const APP_ROOT = "../../";

const mode = process.env.TEST_MODE;

const viaHandler = async (event: any, functionName: string) => {
  const handler =
    require(`${APP_ROOT}/functions/${functionName}/${functionName}`).handler;

  const context = {};
  const response = await handler(event, context);
  const contentType = get(response, "headers.Content-Type", "application/json");
  if (response.body && contentType === "application/json") {
    response.body = JSON.parse(response.body);
  }
  return response;
};

const respondFrom = async (httpRes: any) => ({
  statusCode: httpRes.statusCode,
  body: httpRes.body,
  headers: httpRes.headers,
});

const signHttpRequest = (url: string) => {
  const urlData = new URL(url);
  return sign({
    host: urlData.hostname,
    path: urlData.pathname,
  }).headers as AxiosHeaders;
};

const viaHttp = async (path: string, method: string, opts: any = {}) => {
  const url = `${process.env.REST_API_URL}/${path}`;
  console.log(`invoking via HTTP ${method} ${url}`);

  try {
    const data = get(opts, "body");
    let headers = {};
    if (get(opts, "iam_auth", false)) {
      headers = signHttpRequest(url);
    }

    const authHeader = get(opts, "auth");
    if (authHeader) {
      headers = {
        ...headers,
        Authorization: authHeader,
      };
    }

    const res = await http.request({
      method,
      url,
      headers,
      data,
    });
    return respondFrom(res);
  } catch (e: any) {
    if (e?.response?.status) {
      return {
        statusCode: e?.response?.status,
        headers: e?.response?.headers,
        body: e?.response?.data,
      };
    } else {
      throw e;
    }
  }
};

export const weInvokeGetIndex = async () => {
  switch (mode) {
    case "handler":
      return viaHandler({}, "getIndex");
    case "http":
      return await viaHttp("", "GET");
    default:
      throw new Error(`Unsupported mode: ${mode}`);
  }
};

export const weInvokeGetRestaurants = () => viaHandler({}, "getRestaurants");

export const weInvokeSearchRestaurants = (theme: string) => {
  let event = {
    body: JSON.stringify({ theme }),
  };
  return viaHandler(event, "search-restaurants");
};
