import Link from 'next/link';
export default function NotFound() {
  return <main className="mx-auto grid min-h-[65vh] max-w-2xl content-center gap-5 px-6 py-12 text-foreground"><h1 className="text-3xl font-bold">This page isn’t available.</h1><p className="text-base leading-7 text-muted-foreground">The address may have changed, or your account may not have access. You can return to the public website and use the links available to your account.</p><Link href="/" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Return home</Link></main>;
}
