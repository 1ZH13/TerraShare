import { z } from "zod";

export const ChatStatusSchema = z.enum(["active", "archived"] as const);
export const ChatParticipantRoleSchema = z.enum(["owner", "tenant", "admin"] as const);

export const ChatParticipantSchema = z.object({
  userId: z.string().min(1, "ID de usuario requerido"),
  role: ChatParticipantRoleSchema,
});

export const CreateChatSchema = z.object({
  landId: z.string().optional(),
  rentalRequestId: z.string().optional(),
  participants: z.array(ChatParticipantSchema).min(1, "Al menos un participante requerido"),
});

export type CreateChatInput = z.input<typeof CreateChatSchema>;
export type CreateChatOutput = z.output<typeof CreateChatSchema>;

export const CreateChatMessageSchema = z.object({
  text: z.string().min(1, "Mensaje no puede estar vacío"),
});

export type CreateChatMessageInput = z.input<typeof CreateChatMessageSchema>;
export type CreateChatMessageOutput = z.output<typeof CreateChatMessageSchema>;