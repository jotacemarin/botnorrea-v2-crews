export enum ChatTypeTg {
  PRIVATE = "private",
  GROUP = "group",
  SUPERGROUP = "supergroup",
}

export enum EntityTypeTg {
  BOT_COMMAND = "bot_command",
}

export enum FormattingOptionsTg {
  MARKDOWN_V2 = "MarkdownV2",
  HTML = "HTML",
  MARKDOWN = "Markdown",
}

export interface ChatTg {
  id: number;
  title: string;
  type: ChatTypeTg | string;
  all_members_are_administrators: boolean;
}

export interface UserTg {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name: string;
  username: string;
  language_code: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface EntityTg {
  offset: number;
  length: number;
  type: EntityTypeTg;
}

export interface ReplyMarkupTg {
  inline_keyboard: Array<
    Array<{
      text: string;
      callback_data: string;
    }>
  >;
}

export interface PhotoSizeTg {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size: number;
}

export interface VideoTg {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size: number;
  mime_type: string;
}

export interface MessageTg {
  message_id: number;
  message_thread_id?: number;
  from: UserTg;
  sender_chat?: ChatTg;
  chat: ChatTg;
  date: number;
  text: string;
  caption: string;
  reply_to_message: MessageTg;
  photo: Array<PhotoSizeTg>;
  video: VideoTg;
  entities?: Array<EntityTg>;
  caption_entities?: Array<EntityTg>;
  reply_markup?: ReplyMarkupTg;
}

export interface UpdateTg {
  update_id: number;
  message?: MessageTg;
  callback_query?: {
    id: string;
    from: UserTg;
    message: MessageTg;
    chat_instance: string;
    data: string;
  };
}
