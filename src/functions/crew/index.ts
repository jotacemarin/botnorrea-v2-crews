import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import { BAD_REQUEST, OK, NOT_FOUND } from "http-status";
import { FormattingOptionsTg, UpdateTg, User } from "../../lib/models";
import { CrewDao } from "../../lib/dao";
import { BotnorreaService } from "../../lib/services";
import { getTextCommand } from "../../lib/utils/telegramHelper";

const sendMessage = async (
  body: UpdateTg,
  text: string,
  attachments?: { video?: string; photo?: string } | null
): Promise<void> => {
  const params = {
    chat_id: body?.message!.chat?.id,
    reply_to_message_id: body?.message?.message_id,
    parse_mode: FormattingOptionsTg?.HTML,
  };

  if (attachments?.video) {
    await BotnorreaService.sendVideo({
      ...params,
      caption: text,
      video: attachments.video,
    });
    return;
  }

  if (attachments?.photo) {
    await BotnorreaService.sendPhoto({
      ...params,
      caption: text,
      photo: attachments.photo,
    });
    return;
  }

  await BotnorreaService.sendMessage({
    ...params,
    text,
  });
  return;
};

const getDataFromBody = (body: UpdateTg): { crew: string; message: string } => {
  const key = getTextCommand(body) ?? "";

  const text = body?.message?.text ?? body?.message?.caption ?? "";
  const [crewName, ...rawMessage] = text
    ?.replace(key, "")
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

const buildAttachments = (
  body: UpdateTg
): { video?: string; photo?: string } | null => {
  if (body?.message?.video) {
    return {
      video: body?.message?.video?.file_id,
    };
  }

  if (body?.message?.photo) {
    const [bigPhoto] = body?.message?.photo?.sort(
      (first, second) => first.file_size - second.file_size
    );

    return {
      photo: bigPhoto?.file_id,
    };
  }

  return null;
};

const execute = async (body: UpdateTg): Promise<{ statusCode: number }> => {
  BotnorreaService.initInstance();
  await CrewDao.initInstance();

  const messageWithMembers = await buildMessage(body);
  if (!messageWithMembers) {
    await sendMessage(body, "Crew not found");
    return { statusCode: NOT_FOUND };
  }

  const attachments = buildAttachments(body);
  await sendMessage(body, messageWithMembers, attachments);
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
