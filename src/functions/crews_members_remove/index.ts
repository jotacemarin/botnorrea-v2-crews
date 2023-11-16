import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from "http-status";
import { Crew, FormattingOptionsTg, UpdateTg, User } from "../../lib/models";
import { getTextCommand } from "../../lib/utils/telegramHelper";
import { CrewDao } from "../../lib/dao/crewDao";
import { BotnorreaService } from "../../lib/services/botnorrea";
import { UserDao } from "../../lib/dao/userDao";

const getDataFromBody = (
  body: UpdateTg
): { crewName: string; usernames: Array<string> } => {
  const key = getTextCommand(body) ?? "";

  const [crewName, ...usernames] = body?.message?.text
    ?.replace(key, "")
    ?.trim()
    ?.split(" ");

  return { crewName: crewName?.toLowerCase(), usernames };
};

const getCrew = async (crewName: string) => {
  await CrewDao.initInstance();
  return CrewDao.findByName(crewName);
};

const sendMessage = async (body: UpdateTg, text: string): Promise<void> => {
  BotnorreaService.initInstance();
  await BotnorreaService.sendMessage({
    chat_id: body?.message?.chat?.id,
    text,
    reply_to_message_id: body?.message?.message_id,
    parse_mode: FormattingOptionsTg.HTML,
  });
  return;
};

const getUsersId = async (usernames: Array<string>): Promise<Array<User>> => {
  await UserDao.initInstance();
  const users = await UserDao.findByUsernames(usernames);
  if (!users || !users?.length) {
    return [];
  }

  return users;
};

const cleanMembers = (
  crew: Crew,
  usersInput: Array<User>
): { toKeep: Array<User>; toRemove: Array<User> } => {
  if (!usersInput?.length) {
    return { toKeep: crew?.members, toRemove: [] };
  }

  const toRemove: Array<User> = usersInput?.filter((userInput: User) =>
    crew?.members
      ?.map((member: User) => String(member?._id))
      ?.includes(String(userInput?._id))
  );
  if (!toRemove?.length) {
    return { toKeep: crew?.members, toRemove: [] };
  }

  const toKeep: Array<User> = crew?.members?.filter(
    (member: User) =>
      !usersInput
        ?.map((user: User) => String(user?._id))
        ?.includes(String(member?._id))
  );
  return { toKeep, toRemove };
};

const saveCrew = async (
  crew: Crew,
  members: Array<User>
): Promise<Crew | null> => {
  try {
    await CrewDao.initInstance();
    return CrewDao.save({ ...crew, members });
  } catch (error) {
    return null;
  }
};

const execute = async (
  body: UpdateTg
): Promise<{ statusCode: number; body?: string }> => {
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

  const { toKeep, toRemove } = cleanMembers(crew, usersInput);
  if (!toKeep?.length) {
    await sendMessage(
      body,
      `The crew <b>${crewName}</b> failed to update, you must keep at least one`
    );
    return { statusCode: BAD_REQUEST };
  }

  if (!toRemove?.length) {
    await sendMessage(
      body,
      `The crew <b>${crewName}</b> has not been updated, those users are not part of the crew`
    );
    return { statusCode: BAD_REQUEST };
  }

  const crewUpdated = await saveCrew(crew, toKeep);
  if (!crewUpdated) {
    await sendMessage(body, `The crew <b>${crewName}</b> failed to update`);
    return { statusCode: INTERNAL_SERVER_ERROR };
  }

  const membersRemoved = toRemove
    ?.map((member: User) => `@${member?.username}`)
    ?.join(" | ");
  await sendMessage(
    body,
    `The crew <b>${crewUpdated?.name}</b> has been updated successfully, removed members:\n\n[ ${membersRemoved} ]`
  );
  return { statusCode: OK };
};

export const crewsMembersRemove = async (
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
