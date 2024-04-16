import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { Handler } from "aws-lambda";
import * as init from "chance";
const busName = process.env.bus_name || "bus-name-not-set";

const eventBridge = new EventBridgeClient();
const chance = init.Chance();

export const handler: Handler = async (event, _context) => {
  const restaurantName = JSON.parse(event.body).restaurantName;
  const orderId = chance.guid();
  console.log(`placing order ID [${orderId}] for [${restaurantName}]`);

  const putEvent = new PutEventsCommand({
    Entries: [
      {
        Source: "big-mouth",
        DetailType: "order_placed",
        Detail: JSON.stringify({
          orderId,
          restaurantName,
        }),
        EventBusName: busName,
      },
    ],
  });
  await eventBridge.send(putEvent);

  console.log(`published 'order_placed' event into EventBus [${busName}]`);

  return {
    statusCode: 200,
    body: JSON.stringify({
      orderId,
    }),
  };
};
