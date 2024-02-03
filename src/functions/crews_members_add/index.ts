import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import { OK, BAD_REQUEST, NOT_FOUND, INTERNAL_SERVER_ERROR } from "http-status";
import { Crew, FormattingOptionsTg, UpdateTg, User } from "../../lib/models";
import { CrewDao, UserDao } from "../../lib/dao";
import { BotnorreaService } from "../../lib/services";
import { getTextCommand } from "../../lib/utils/telegramHelper";

const sendMessage = async (body: UpdateTg, text: string): Promise<void> => {
  await BotnorreaService.sendMessage({
    chat_id: body?.message!.chat?.id,
    text,
    reply_to_message_id: body?.message?.message_id,
    parse_mode: FormattingOptionsTg.HTML,
  });
  return;
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

const getUsersId = async (usernames: Array<string>): Promise<Array<User>> => {
  const users = await UserDao.findByUsernames(usernames);
  if (!users || !users?.length) {
    return [];
  }

  return users;
};

const getCrew = async (crewName: string) => {
  return CrewDao.findByName(crewName);
};

const removeDupleMembers = (
  crew: Crew,
  usersInput: Array<User>
): Array<User> => {
  const mergedUsers = [...crew?.members, ...usersInput];
  const usersOnlyStringId = mergedUsers?.map((user: User) => String(user?._id));
  const withoutDuplesStringId = [...new Set(usersOnlyStringId)];

  return withoutDuplesStringId?.map(
    (mongoId: string) =>
      mergedUsers?.find((user: User) => String(user?._id) === mongoId) as User
  );
};

const saveCrew = async (
  crew: Crew,
  members: Array<User>
): Promise<Crew | null> => {
  try {
    return CrewDao.save({ ...crew, members });
  } catch (error) {
    return null;
  }
};

const execute = async (
  body: UpdateTg
): Promise<{ statusCode: number; body?: string }> => {
  BotnorreaService.initInstance();
  await CrewDao.initInstance();
  await UserDao.initInstance();

  const { crewName, usernames } = getDataFromBody(body);

  const crew = await getCrew(crewName);
  if (!crew) {
    await sendMessage(body, `Crew <b>${crewName}</b> not found`);
    return { statusCode: NOT_FOUND };
  }

  const usersInput = await getUsersId(usernames);
  if (!usersInput?.length) {
    await sendMessage(body, "Please include at least one user");
    return { statusCode: BAD_REQUEST };
  }

  const filteredUsers = removeDupleMembers(crew, usersInput);
  const crewUpdated = await saveCrew(crew, filteredUsers);
  if (!crewUpdated) {
    await sendMessage(body, `The crew <b>${crewName}</b> failed to update`);
    return { statusCode: INTERNAL_SERVER_ERROR };
  }

  const membersUpdated = crewUpdated?.members
    ?.map((member: User) => `@${member?.username}`)
    ?.join(" | ");
  await sendMessage(
    body,
    `The crew <b>${crewUpdated?.name}</b> has been updated successfully, members:\n\n[ ${membersUpdated} ]`
  );
  return { statusCode: OK };
};

export const crewsMembersAdd = async (
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
