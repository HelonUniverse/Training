import { redirect } from 'next/navigation';

/** The root is a router: middleware sends signed-in users to /app. */
export default function Home() {
  redirect('/sign-in');
}
