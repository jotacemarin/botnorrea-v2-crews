import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import { BAD_REQUEST, OK, NOT_FOUND } from "http-status";
import { FormattingOptionsTg, UpdateTg, User } from "../../lib/models";
import { CrewDao } from "../../lib/dao";
import { BotnorreaService } from "../../lib/services";
import { getTextCommand } from "../../lib/utils/telegramHelper";

const sendMessage = async (body: UpdateTg, text: string): Promise<void> => {
  await BotnorreaService.sendMessage({
    chat_id: body?.message!.chat?.id,
    text,
    reply_to_message_id: body?.message?.message_id,
    parse_mode: FormattingOptionsTg?.HTML,
  });
  return;
};

const getDataFromBody = (body: UpdateTg): { crew: string; message: string } => {
  const key = getTextCommand(body) ?? "";

  const [crewName, ...rawMessage] = body
    ?.message!.text?.replace(key, "")
    ?.replace(/[\r\n]+/g, " ")
    ?.trim()
    ?.split(" ");

  return {
    crew: crewName?.toLowerCase(),
    message: rawMessage?.join(" ")?.trim(),
  };
};

const getCrewMembers = async (name: string): Promise<string | void> => {
  const crew = await CrewDao.findByName(name);
  if (!crew) {
    return;
  }

  if (!crew?.members || !crew?.members?.length) {
    return;
  }

  const members = crew?.members
    ?.filter((member) => typeof member !== "string")
    ?.map((member) => member as User)
    ?.map((member: User) => `@${member?.username}`)
    ?.join(" | ");

  if (!members) {
    return;
  }

  return `[ ${members} ]`;
};

const buildMessage = async (body: UpdateTg): Promise<string | void> => {
  const { crew, message } = getDataFromBody(body);
  const crewMembers = await getCrewMembers(crew);
  if (!crewMembers) {
    return;
  }

  return [
    `${crew}:`,
    Boolean(message) ? `\n<b>${message}</b>\n` : "",
    `${crewMembers}`,
  ]
    ?.join("\n")
    ?.trim();
};

const execute = async (body: UpdateTg): Promise<{ statusCode: number }> => {
  BotnorreaService.initInstance();
  await CrewDao.initInstance();

  const crewMembers = await buildMessage(body);
  if (!crewMembers) {
    await sendMessage(body, "Crew not found");
    return { statusCode: NOT_FOUND };
  }

  await sendMessage(body, crewMembers);
  return { statusCode: OK };
};

export const crew = async (
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
