import axios, { AxiosResponse, AxiosInstance } from "axios";
import { EntityTg, UserTg, FormattingOptionsTg, ChatTg } from "../models";

const { TELEGRAM_SEND_MESSAGE_URL, USERNAME, PASSWORD } = process.env;

interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: any;
  login_url?: any;
  switch_inline_query?: string;
  switch_inline_query_current_chat?: string;
  switch_inline_query_chosen_chat?: any;
  callback_game?: any;
  pay?: boolean;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: Array<Array<InlineKeyboardButton>>;
}

export interface SendMessageParams {
  chat_id: number | string;
  text: string;
  message_thread_id?: number;
  parse_mode?: FormattingOptionsTg;
  entities?: Array<EntityTg>;
  protect_content?: boolean;
  reply_to_message_id?: number;
  reply_markup?: InlineKeyboardMarkup;
}

export interface EditMessageParams {
  chat_id: number | string;
  message_id: number | string;
  text: string;
  reply_markup?: InlineKeyboardMarkup;
  message_thread_id?: number;
  parse_mode?: FormattingOptionsTg;
  entities?: Array<EntityTg>;
  protect_content?: boolean;
  reply_to_message_id?: number;
}

export interface SendPhotoParams {
  chat_id: number | string;
  photo: string;
  caption?: string;
  parse_mode?: FormattingOptionsTg;
  caption_entities?: Array<EntityTg>;
  reply_to_message_id?: number;
  allow_sending_without_reply?: boolean;
  protect_content?: boolean;
  reply_markup?: {
    inline_keyboard: Array<any>;
  };
  has_spoiler?: boolean;
}

export interface SendVideoParams {
  chat_id: number | string;
  video: string;
  caption?: string;
  parse_mode?: FormattingOptionsTg;
  caption_entities?: Array<EntityTg>;
  reply_to_message_id?: number;
  allow_sending_without_reply?: boolean;
  protect_content?: boolean;
  reply_markup?: {
    inline_keyboard: Array<any>;
  };
  has_spoiler?: boolean;
}

export interface GetChatsParams {
  user: number | string;
  chats: Array<number | string>;
}

interface SendMessageResponse {
  message_id: number;
  message_thread_id: number;
  from: UserTg;
  sender_chat: any;
  date: number;
  entities: Array<EntityTg>;
}

interface GetChatsResponse {
  group: {
    id: number | string;
    title: string;
  };
  user: UserTg;
  status: string;
}

interface CleanReplyMarkupResponse {
  ok: boolean;
  result: {
    message_id: number | string;
    from: UserTg;
    chat: ChatTg;
    date: number;
    edit_date: number;
    text: string;
  };
}

export class BotnorreaService {
  private static instance: AxiosInstance;

  private constructor() {}

  public static initInstance(): void {
    if (!this.instance) {
      this.instance = axios.create({
        baseURL: `${TELEGRAM_SEND_MESSAGE_URL}`,
        auth: { username: `${USERNAME}`, password: `${PASSWORD}` },
      });
    }
  }

  public static sendMessage(
    params: SendMessageParams
  ): Promise<AxiosResponse<SendMessageResponse>> {
    return BotnorreaService.instance.post("/send-message", params);
  }

  public static editMessage(
    params: EditMessageParams
  ): Promise<AxiosResponse<SendMessageResponse>> {
    return BotnorreaService.instance.post("/edit-message", params);
  }

  public static sendPhoto(
    params: SendPhotoParams
  ): Promise<AxiosResponse<SendMessageResponse>> {
    return BotnorreaService.instance.post("/send-photo", params);
  }

  public static sendVideo(
    params: SendVideoParams
  ): Promise<AxiosResponse<SendMessageResponse>> {
    return BotnorreaService.instance.post("/send-video", params);
  }

  public static getChats(
    params: GetChatsParams
  ): Promise<AxiosResponse<Array<GetChatsResponse>>> {
    return BotnorreaService.instance.post("/get-chats", params);
  }

  public static cleanReplyMarkup(
    chatId: number | string,
    messageId: number | string
  ): Promise<AxiosResponse<Array<CleanReplyMarkupResponse>>> {
    return BotnorreaService.instance.post("/clean-reply-markup", {
      chatId,
      messageId,
    });
  }
}
