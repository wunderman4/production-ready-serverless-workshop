import { DynamoDB } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { config } from "dotenv";

config();

const dynamodbClient = new DynamoDB({
  region: "us-east-1",
});
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

const restaurants = [
  {
    name: "Fangtasia",
    image: "https://d2qt42rcwzspd6.cloudfront.net/manning/fangtasia.png",
    themes: ["true blood"],
  },
  {
    name: "Shoney's",
    image: "https://d2qt42rcwzspd6.cloudfront.net/manning/shoney's.png",
    themes: ["cartoon", "rick and morty"],
  },
  {
    name: "Freddy's BBQ Joint",
    image:
      "https://d2qt42rcwzspd6.cloudfront.net/manning/freddy's+bbq+joint.png",
    themes: ["netflix", "house of cards"],
  },
  {
    name: "Pizza Planet",
    image: "https://d2qt42rcwzspd6.cloudfront.net/manning/pizza+planet.png",
    themes: ["netflix", "toy story"],
  },
  {
    name: "Leaky Cauldron",
    image: "https://d2qt42rcwzspd6.cloudfront.net/manning/leaky+cauldron.png",
    themes: ["movie", "harry potter"],
  },
  {
    name: "Lil' Bits",
    image: "https://d2qt42rcwzspd6.cloudfront.net/manning/lil+bits.png",
    themes: ["cartoon", "rick and morty"],
  },
  {
    name: "Fancy Eats",
    image: "https://d2qt42rcwzspd6.cloudfront.net/manning/fancy+eats.png",
    themes: ["cartoon", "rick and morty"],
  },
  {
    name: "Don Cuco",
    image: "https://d2qt42rcwzspd6.cloudfront.net/manning/don%20cuco.png",
    themes: ["cartoon", "rick and morty"],
  },
];

const putReqs = restaurants.map((x) => ({
  PutRequest: {
    Item: x,
  },
}));

const restaurants_table = process.env.restaurants_table;

if (restaurants_table === undefined) {
  console.error("Please set the restaurants_table environment variable");
  process.exit(1);
} else {
  const cmd = new BatchWriteCommand({
    RequestItems: {
      [restaurants_table]: putReqs,
    },
  });
  dynamodb
    .send(cmd)
    .then(() => console.log("all done"))
    .catch((err) => console.error(err));
}
