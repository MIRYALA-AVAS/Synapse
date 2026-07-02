export const getAllowedDomains = () =>
  (process.env.ALLOWED_EMAIL_DOMAIN || '')
    .split(',')
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
