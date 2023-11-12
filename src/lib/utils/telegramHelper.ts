import { EntityTypeTg, UpdateTg } from "../models";

const filterTextCommandEntity = ({ type, offset }) =>
  type === EntityTypeTg.BOT_COMMAND && offset === 0;

const checkIfHasTextCommand = (body: UpdateTg) => {
  const commands = body?.message?.entities?.filter(filterTextCommandEntity);
  return Boolean(commands?.length);
};

const getTextCommandPosition = (
  body: UpdateTg
): { offset: number; length: number } => {
  const commands = body?.message?.entities?.filter(filterTextCommandEntity);
  if (!commands?.length) {
    return { offset: 0, length: 0 };
  }

  const [{ offset, length }] = commands;
  return { offset, length };
};

const getTextCommandKey = (
  body: UpdateTg,
  position: { offset: number; length: number }
) => {
  const key = body?.message?.text?.substring(
    position?.offset,
    position?.length
  );

  return key?.trim();
};

export const getTextCommand = (body: UpdateTg): null | string => {
  const hasTextCommand = checkIfHasTextCommand(body);
  if (!hasTextCommand) {
    return null;
  }

  const position = getTextCommandPosition(body);
  const key = getTextCommandKey(body, position);
  if (key === "") {
    return null;
  }

  return key;
};
