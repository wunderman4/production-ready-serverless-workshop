const cheerio = require("cheerio");
import { init } from "../init";
import * as when from "../steps/when";

describe(`When we invoke the GET / endpoint`, () => {
  beforeAll(async () => {
    await init();
  });

  it(`Should return the index page with 8 restaurants`, async () => {
    const res = await when.weInvokeGetIndex();

    expect(res.statusCode).toEqual(200);
    expect(res.headers["Content-Type"]).toEqual("text/html; charset=UTF-8");
    expect(res.body).toBeDefined();

    const $ = cheerio.load(res.body);
    const restaurants = $(".restaurant", "#restaurantsUl");
    expect(restaurants.length).toEqual(8);
  });
});
