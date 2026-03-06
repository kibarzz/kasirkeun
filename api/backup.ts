export const runtime = 'edge';

export default async function handler(req: Request) {
  return new Response(JSON.stringify({ 
    message: 'Backups are handled by Turso. Please visit your Turso dashboard to manage database backups.',
    url: 'https://turso.tech/dashboard'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
