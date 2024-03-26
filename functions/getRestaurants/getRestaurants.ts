import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Handler } from "aws-lambda";

const dynamoClient = new DynamoDB();
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

const defaultResults = parseInt(process.env.default_results || "10");
const tableName = process.env.restaurants_table;

const getRestaurants = async (count: number) => {
  console.log(`fetching ${count} restaurants from ${tableName}...`);

  const resp = await dynamodb.send(
    new ScanCommand({
      TableName: tableName,
      Limit: count,
    })
  );
  console.log(`found ${resp.Items?.length} restaurants`);
  return resp.Items;
};

export const handler: Handler = async (event, context) => {
  const restaurants = await getRestaurants(defaultResults);
  return {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  };
};
