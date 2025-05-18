import CreateStrip from './CreateStrip';

export default function CreateStripPage({ params }) {
  return (
    <div>
      <CreateStrip comicId={params.id} />
    </div>
  );
} 