export const EMAIL_SENDER = Symbol("EMAIL_SENDER");

export interface IEmailSender {
  sendBoardCompletionEmail(to: string, clientName: string, boardTitle: string, publicToken?: string): Promise<boolean>;
  sendCardAssignedEmail(to: string, userName: string, cardTitle: string, boardTitle: string): Promise<boolean>;
  sendOverdueNotificationEmail(to: string, userName: string, cardTitle: string, boardTitle: string, dueDate: string): Promise<boolean>;
}