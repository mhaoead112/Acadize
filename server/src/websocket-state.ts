import { WebSocket } from 'ws';

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  organizationId?: string;
}

export const clients = new Map<string, Set<AuthenticatedWebSocket>>();
export const conversationClients = new Map<string, Set<string>>();

export function broadcastToUser(userId: string, data: any) {
  const userClients = clients.get(userId);
  if (userClients) {
    userClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
}

export function broadcastToConversation(conversationId: string, data: any, excludeUserId?: string) {
  const conversationUsers = conversationClients.get(conversationId);
  if (!conversationUsers) return;

  conversationUsers.forEach(userId => {
    if (userId === excludeUserId) return;

    const userClients = clients.get(userId);
    if (userClients) {
      userClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    }
  });
}
