export type ChatStatus = "active" | "archived";

export type ChatParticipantRole = "owner" | "tenant" | "admin";

export interface ChatParticipantDto {
  userId: string;
  role: ChatParticipantRole;
}

export interface ChatLastMessageDto {
  text: string;
  senderId: string;
  createdAt: string;
}

export interface ChatOtherParticipantDto {
  userId: string;
  role: ChatParticipantRole;
  displayName: string;
}

export interface ChatDto {
  id: string;
  landId?: string;
  rentalRequestId?: string;
  participants: ChatParticipantDto[];
  status: ChatStatus;
  createdAt: string;
  updatedAt: string;
  // Enriquecimiento opcional que añade GET /chats para la bandeja (#149):
  otherParticipant?: ChatOtherParticipantDto;
  landTitle?: string;
  lastMessage?: ChatLastMessageDto;
  unread?: boolean;
}

export interface ChatMessageDto {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface CreateChatDto {
  landId?: string;
  rentalRequestId?: string;
  participants: ChatParticipantDto[];
}

export interface CreateChatMessageDto {
  text: string;
}

export interface ExternalContactDto {
  whatsappEnabled: boolean;
  contact?: {
    phone: string;
    displayName: string;
  };
}
