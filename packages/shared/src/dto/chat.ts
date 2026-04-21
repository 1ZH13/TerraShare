export type ChatStatus = "active" | "archived";

export type ChatParticipantRole = "owner" | "tenant" | "admin";

export interface ChatParticipantDto {
  userId: string;
  role: ChatParticipantRole;
}

export interface ChatDto {
  id: string;
  landId?: string;
  rentalRequestId?: string;
  participants: ChatParticipantDto[];
  status: ChatStatus;
  createdAt: string;
  updatedAt: string;
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
