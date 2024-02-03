import { EntityTypeTg, UpdateTg } from "../models";

const filterTextCommandEntity = ({ type, offset }) =>
  type === EntityTypeTg.BOT_COMMAND && offset === 0;

const checkIfHasTextCommand = (body: UpdateTg) => {
  const entities = body?.message?.entities ?? [];
  const caption_entities = body?.message?.caption_entities ?? [];
  const commands = [...entities, ...caption_entities]?.filter(
    filterTextCommandEntity
  );
  return Boolean(commands?.length);
};

const getTextCommandPosition = (
  body: UpdateTg
): { offset: number; length: number } => {
  const entities = body?.message?.entities ?? [];
  const caption_entities = body?.message?.caption_entities ?? [];
  const commands = [...entities, ...caption_entities]?.filter(
    filterTextCommandEntity
  );
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
  const text = body?.message?.text ?? body?.message?.caption;
  const key = text?.substring(position?.offset, position?.length);

  return key?.trim();
};

export const getTextCommand = (body: UpdateTg): null | string => {
  const hasTextCommand = checkIfHasTextCommand(body);
  if (!hasTextCommand) {
    return null;
  }

  const position = getTextCommandPosition(body);
  const key = getTextCommandKey(body, position);
  if (!key) {
    return null;
  }

  if (key === "") {
    return null;
  }

  return key;
};
