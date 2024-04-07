import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import middy from "@middy/core";
import ssm from "@middy/ssm";
import { Context } from "aws-lambda";

const { service_name, stage_name } = process.env;
const tableName = process.env.restaurants_table;
const dynamoClient = new DynamoDBClient();
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

const findRestaurantsByTheme = async (theme: string, count = 5) => {
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

interface SearchRestaurantsContext extends Context {
  config: {
    defaultResults: number;
  };
}

export const handler = middy<any, any, Error, SearchRestaurantsContext>()
  .use(
    ssm({
      cache: true,
      cacheExpiry: 1 * 60 * 1000, // 1 minute
      setToContext: true,
      fetchData: {
        config: `/${service_name}/${stage_name}/search-restaurants/config`,
      },
    })
  )
  .handler(async (event, context) => {
    const req = JSON.parse(event.body);
    const theme = req.theme;
    const restaurants = await findRestaurantsByTheme(
      theme,
      context?.config?.defaultResults
    );
    return {
      statusCode: 200,
      body: JSON.stringify(restaurants),
    };
  });
