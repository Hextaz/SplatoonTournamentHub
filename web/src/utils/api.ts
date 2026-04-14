export const getBotApiUrl = () => {
  return process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:8080';
};
