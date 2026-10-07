import { SyllabusImport } from '@/components/syllabus-import';

export const metadata = { title: 'Import syllabus' };
export default async function SyllabusPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const { course } = await searchParams;
  return <SyllabusImport initialCourseId={course} />;
}
