import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Handler } from "aws-lambda";

const defaultResults = parseInt(process.env.default_results || "10");
const tableName = process.env.restaurants_table;
const dynamoClient = new DynamoDBClient();
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

const findRestaurantsByTheme = async (theme: string, count: number) => {
  console.log(
    `finding (up to ${count}) restaurants with the theme ${theme}...`
  );
  const resp = await dynamodb.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: "contains(themes, :theme)",
      ExpressionAttributeValues: {
        ":theme": theme,
      },
      Limit: count,
    })
  );
  console.log(`found ${resp.Items?.length} restaurants`);
  return resp.Items;
};

export const handler: Handler = async (event, context) => {
  const req = JSON.parse(event.body);
  const theme = req.theme;
  const restaurants = await findRestaurantsByTheme(theme, defaultResults);
  return {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  };
};
