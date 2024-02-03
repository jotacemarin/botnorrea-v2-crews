import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import { OK, BAD_REQUEST, NOT_FOUND } from "http-status";
import { Crew, UpdateTg } from "../../lib/models";
import { BotnorreaService } from "../../lib/services";
import { CrewDao } from "../../lib/dao";

const getCrews = async (): Promise<Array<Crew>> => {
  await CrewDao.initInstance();
  return CrewDao.findAll();
};

const sendMessage = async (body: UpdateTg, text: string): Promise<void> => {
  BotnorreaService.initInstance();
  await BotnorreaService.sendMessage({
    chat_id: body?.message!.chat?.id,
    text,
    reply_to_message_id: body?.message?.message_id,
  });
  return;
};

const execute = async (
  body: UpdateTg
): Promise<{ statusCode: number; body?: string }> => {
  const crews = await getCrews();
  if (!crews?.length) {
    await sendMessage(body, "Crews not found");
    return { statusCode: NOT_FOUND };
  }

  const message = crews.map((crew: Crew) => `- ${crew?.name}`).join("\n");

  await sendMessage(body, `List of crews:\n\n${message}`);
  return { statusCode: OK };
};

export const crews = async (
  event: APIGatewayEvent,
  context: Context,
  callback: Callback
): Promise<void> => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!event?.body) {
    return callback(null, { statusCode: BAD_REQUEST });
  }

  const body = JSON.parse(event?.body);
  const response = await execute(body);
  return callback(null, response);
};
