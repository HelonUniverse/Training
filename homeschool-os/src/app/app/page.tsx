import { redirect } from 'next/navigation';
import { getActiveContext } from '@/lib/auth/context';

/** Send the user to the dashboard for whichever workspace is active. */
export default async function AppIndex() {
  const context = await getActiveContext();
  redirect(context?.kind === 'organization' ? '/app/org/home' : '/app/home');
}
