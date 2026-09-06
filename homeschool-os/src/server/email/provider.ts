import 'server-only';

/**
 * The email boundary.
 *
 * Application code never talks to a vendor. It builds a Message and hands it to
 * whichever provider is configured, so swapping Resend for Postmark (or for an
 * in-house relay) is a change in exactly one place.
 *
 * With nothing configured, the console adapter logs the message and reports
 * `skipped` - the outbox row records that plainly rather than claiming a send
 * that never happened.
 */

export type Message = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendOutcome =
  | { status: 'sent'; provider: string; providerId?: string }
  | { status: 'skipped'; provider: string; reason: string }
  | { status: 'failed'; provider: string; error: string };

export interface EmailProvider {
  readonly name: string;
  send(message: Message): Promise<SendOutcome>;
}

/** Development / unconfigured. Never pretends a message was delivered. */
class ConsoleProvider implements EmailProvider {
  readonly name = 'console';
  async send(message: Message): Promise<SendOutcome> {
    // eslint-disable-next-line no-console
    console.info(
      `\n[email:console] to=${message.to}\n  subject: ${message.subject}\n` +
        `  ${message.text.split('\n').join('\n  ')}\n`,
    );
    return { status: 'skipped', provider: this.name, reason: 'no email provider configured' };
  }
}

class ResendProvider implements EmailProvider {
  readonly name = 'resend';
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: Message): Promise<SendOutcome> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });
      if (!res.ok) {
        return { status: 'failed', provider: this.name, error: `${res.status} ${await res.text()}` };
      }
      const body = (await res.json()) as { id?: string };
      return { status: 'sent', provider: this.name, providerId: body.id };
    } catch (e) {
      return { status: 'failed', provider: this.name, error: (e as Error).message };
    }
  }
}

class PostmarkProvider implements EmailProvider {
  readonly name = 'postmark';
  constructor(
    private readonly token: string,
    private readonly from: string,
  ) {}

  async send(message: Message): Promise<SendOutcome> {
    try {
      const res = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': this.token,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          From: this.from,
          To: message.to,
          Subject: message.subject,
          HtmlBody: message.html,
          TextBody: message.text,
          MessageStream: 'outbound',
        }),
      });
      if (!res.ok) {
        return { status: 'failed', provider: this.name, error: `${res.status} ${await res.text()}` };
      }
      const body = (await res.json()) as { MessageID?: string };
      return { status: 'sent', provider: this.name, providerId: body.MessageID };
    } catch (e) {
      return { status: 'failed', provider: this.name, error: (e as Error).message };
    }
  }
}

export function getEmailProvider(): EmailProvider {
  const from = process.env.EMAIL_FROM ?? 'Homeschool OS <no-reply@example.invalid>';

  if (process.env.RESEND_API_KEY) {
    return new ResendProvider(process.env.RESEND_API_KEY, from);
  }
  if (process.env.POSTMARK_SERVER_TOKEN) {
    return new PostmarkProvider(process.env.POSTMARK_SERVER_TOKEN, from);
  }
  return new ConsoleProvider();
}
