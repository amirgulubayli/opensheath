import { relayChatMessage } from '../apps/api/src/openclaw-chat-relay.ts';

console.log('Testing chat relay...');
const result = await relayChatMessage('hi what can you do? be brief', {
  host: '100.111.98.27',
  port: 18790,
  token: '6926c794baef57e9afe248638f1b48a93cc74d3a9ce27796',
  sessionKey: 'agent:main:main',
  timeoutMs: 45000,
});
console.log('OK:', result.ok);
console.log('Reply length:', result.reply.length);
console.log('Fragments:', result.fragments.length);
console.log('Error:', result.error);
console.log('Duration:', result.durationMs);
if (result.reply) console.log('Reply:', result.reply.substring(0, 600));
process.exit(0);
