import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import middy from "@middy/core";
import ssm from "@middy/ssm";
import { Context } from "aws-lambda";

const dynamoClient = new DynamoDB();
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const { service_name, ssm_stage_name } = process.env;
const middyCacheEnabled = JSON.parse(process.env.middy_cache_enabled || "true");
const middyCacheExpiryMilliseconds = parseInt(
  process.env.middy_cache_expiry_milliseconds || "60000"
);
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

interface CustomContext extends Context {
  config: {
    defaultResults: number;
  };
}

export const handler = middy<unknown, any, Error, CustomContext>()
  .use(
    ssm({
      cache: middyCacheEnabled,
      cacheExpiry: middyCacheExpiryMilliseconds,
      setToContext: true,
      fetchData: {
        config: `/${service_name}/${ssm_stage_name}/get-restaurants/config`,
      },
    })
  )
  .handler(async (event, context) => {
    const restaurants = await getRestaurants(context?.config?.defaultResults);
    return {
      statusCode: 200,
      body: JSON.stringify(restaurants),
    };
  });
