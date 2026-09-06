import 'server-only';
import type { Message } from './provider';

/**
 * Transactional email content.
 *
 * Written out in both supported locales rather than machine-translated at send
 * time: an invitation is the first thing a family ever receives from us, and a
 * translation nobody read is a bad first impression. The Spanish is written for
 * US Hispanic families, not translated word-for-word from the English.
 *
 * The invitation link carries the one-time token. That token is never stored in
 * the outbox row - it exists here, in memory, only long enough to be sent.
 */

export type Locale = 'en-US' | 'es-US';

export type InvitationEmail = {
  to: string;
  locale: Locale;
  organizationName: string;
  invitedBy: string;
  acceptUrl: string;
  expiresAt: string;
};

function layout(bodyHtml: string, footer: string): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1c1c1a">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
${bodyHtml}
<p style="margin-top:32px;font-size:13px;line-height:1.5;color:#77776f">${footer}</p>
</div></body></html>`;
}

function button(url: string, label: string): string {
  return `<p style="margin:28px 0"><a href="${url}" style="display:inline-block;background:#2f6f5e;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:500">${label}</a></p>`;
}

const COPY = {
  'en-US': (e: InvitationEmail) => ({
    subject: `${e.invitedBy} invited you to ${e.organizationName}`,
    html: layout(
      `<h1 style="margin:0 0 16px;font-size:22px">You have been invited to ${escape(e.organizationName)}</h1>
<p style="margin:0;line-height:1.6">${escape(e.invitedBy)} added you to ${escape(e.organizationName)} on Homeschool OS. Accept the invitation to see the students and records you have been given access to.</p>
${button(e.acceptUrl, 'Accept invitation')}
<p style="margin:0;line-height:1.6;font-size:14px;color:#57574f">This link works once, and only for ${escape(e.to)}. It expires on ${e.expiresAt}.</p>`,
      'If you were not expecting this, you can ignore it - nothing happens until you accept.',
    ),
    text: `${e.invitedBy} added you to ${e.organizationName} on Homeschool OS.

Accept the invitation:
${e.acceptUrl}

This link works once, and only for ${e.to}. It expires on ${e.expiresAt}.
If you were not expecting this, you can ignore it - nothing happens until you accept.`,
  }),

  'es-US': (e: InvitationEmail) => ({
    subject: `${e.invitedBy} te invitó a ${e.organizationName}`,
    html: layout(
      `<h1 style="margin:0 0 16px;font-size:22px">Te invitaron a ${escape(e.organizationName)}</h1>
<p style="margin:0;line-height:1.6">${escape(e.invitedBy)} te agregó a ${escape(e.organizationName)} en Homeschool OS. Acepta la invitación para ver a los estudiantes y los archivos a los que te dieron acceso.</p>
${button(e.acceptUrl, 'Aceptar invitación')}
<p style="margin:0;line-height:1.6;font-size:14px;color:#57574f">Este enlace sirve una sola vez y solamente para ${escape(e.to)}. Vence el ${e.expiresAt}.</p>`,
      'Si no esperabas este correo, no tienes que hacer nada - no pasa nada hasta que aceptes.',
    ),
    text: `${e.invitedBy} te agregó a ${e.organizationName} en Homeschool OS.

Acepta la invitación:
${e.acceptUrl}

Este enlace sirve una sola vez y solamente para ${e.to}. Vence el ${e.expiresAt}.
Si no esperabas este correo, no tienes que hacer nada - no pasa nada hasta que aceptes.`,
  }),
} as const;

/** Organization and inviter names are user-supplied; they go through here. */
function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function invitationMessage(details: InvitationEmail): Message {
  const build = COPY[details.locale] ?? COPY['en-US'];
  const { subject, html, text } = build(details);
  return { to: details.to, subject, html, text };
}
