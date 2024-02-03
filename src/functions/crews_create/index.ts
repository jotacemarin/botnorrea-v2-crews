import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import { CREATED, BAD_REQUEST, NOT_MODIFIED } from "http-status";
import { Crew, FormattingOptionsTg, UpdateTg, User } from "../../lib/models";
import { BotnorreaService } from "../../lib/services";
import { CrewDao, UserDao } from "../../lib/dao";
import { getTextCommand } from "../../lib/utils/telegramHelper";

const extractSelfUser = async (body: UpdateTg): Promise<User | null> => {
  return UserDao.findByTelegramId(Number(body?.message?.from?.id));
};

const getUsersId = async (usernames: Array<string>): Promise<Array<User>> => {
  const users = await UserDao.findByUsernames(usernames);
  if (!users || !users?.length) {
    return [];
  }

  return users;
};

const removeDupleMembers = (usersInput: Array<User>): Array<User> => {
  const usersOnlyStringId = usersInput?.map((user: User) => String(user?._id));
  const withoutDuplesStringId = [...new Set(usersOnlyStringId)];

  return withoutDuplesStringId?.map(
    (mongoId: string) =>
      usersInput?.find((user: User) => String(user?._id) === mongoId) as User
  );
};

const getDataFromBody = (
  body: UpdateTg
): { crewName: string; usernames: Array<string> } => {
  const key = getTextCommand(body) ?? "";

  const [crewName, ...usernames] = body
    ?.message!.text?.replace(key, "")
    ?.trim()
    ?.split(" ");

  return { crewName: crewName?.toLowerCase(), usernames };
};

const findCrewByName = async (crewName: string): Promise<Crew | null> => {
  return CrewDao.findByName(crewName);
};

const sendMessage = async (body: UpdateTg, text: string): Promise<void> => {
  await BotnorreaService.sendMessage({
    chat_id: body?.message!.chat?.id,
    text,
    reply_to_message_id: body?.message?.message_id,
    parse_mode: FormattingOptionsTg.HTML,
  });
  return;
};

const saveCrew = async (
  body: UpdateTg,
  crewName: string,
  usernames: Array<string>
): Promise<Crew | null> => {
  const user = await extractSelfUser(body);
  if (!user) {
    return null;
  }

  const usersInput = await getUsersId(usernames);
  const mergedUsers = removeDupleMembers([user, ...usersInput]);

  try {
    return CrewDao.save({
      name: crewName,
      members: mergedUsers,
    });
  } catch (error) {
    return null;
  }
};

const buildUsernames = (crew: Crew): string =>
  crew?.members?.map((member: User) => `@${member?.username}`).join(" | ");

const execute = async (
  body: UpdateTg
): Promise<{ statusCode: number; body?: string }> => {
  BotnorreaService.initInstance();
  await UserDao.initInstance();
  await CrewDao.initInstance();

  const { crewName, usernames } = getDataFromBody(body);
  const existingCrew = await findCrewByName(crewName);
  if (existingCrew) {
    await sendMessage(body, `The crew ${crewName} is already exists`);
    return { statusCode: NOT_MODIFIED };
  }

  const crewCreated = await saveCrew(body, crewName, usernames);
  if (!crewCreated) {
    await sendMessage(body, "Crew could not be created");
    return { statusCode: BAD_REQUEST };
  }

  const usernamesFormatted = buildUsernames(crewCreated);
  await sendMessage(
    body,
    `Crew <b>${crewCreated?.name}</b> has been created, members:\n\n[ ${usernamesFormatted} ]`
  );
  return { statusCode: CREATED };
};

export const crewsCreate = async (
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
